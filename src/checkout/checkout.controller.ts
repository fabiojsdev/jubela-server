import {
  Body,
  Controller,
  HttpStatus,
  Inject,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Post,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import MercadoPagoConfig, { Payment } from 'mercadopago';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { TokenPayloadParam } from 'src/auth/params/token-payload.param';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { Order } from 'src/orders/entities/order.entity';
import { Product } from 'src/products/entities/product.entity';
import { Repository } from 'typeorm';
import { CheckoutService } from './checkout.service';
import mercadopagoConfig from './config/mercadopago.config';
import { OrderDTO } from './dto/order.dto';

@Controller('checkout')
export class CheckoutController {
  private readonly logger = new Logger(CheckoutService.name);
  private paymentApi: Payment;

  constructor(
    @Inject(mercadopagoConfig.KEY)
    private readonly mercadoPagoConfiguration: ConfigType<
      typeof mercadopagoConfig
    >,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly productsRepository: Repository<Product>,
    private readonly checkoutService: CheckoutService,
  ) {
    const client = new MercadoPagoConfig({
      accessToken: mercadoPagoConfiguration.accessToken,
    });

    this.paymentApi = new Payment(client);
  }

  @Post('preference')
  async Create(
    @Body() orderDTO: OrderDTO,
    @TokenPayloadParam() tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const pref = await this.checkoutService.CreatePreference(
      orderDTO,
      tokenPayloadDTO,
    );
    return {
      id: pref.id,
      init_point: pref.init_point,
      // remover em prod
      sandbox_init_point: pref.sandbox_init_point,
    };
  }

  @Post('webhooks/mercadopago')
  async Handle(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    try {
      const xSignature = req.headers['x-signature'] as string;
      const xRequestedId = req.headers['x-request-id'] as string;
      const dataId = req.body?.data?.id;

      this.logger.log('Webhook recebido:', JSON.stringify(req.body));

      if (!xSignature || !xRequestedId || !dataId) {
        this.logger.warn('Headers ou data.id ausentes no webhook');
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Daods ou cabeçalhos necessários não fornecidos',
        });
      }

      const isValid = this.ValidateSignature(xSignature, xRequestedId, dataId);

      if (!isValid) {
        this.logger.warn('Assinatura inválida no webhook');
        return res.status(HttpStatus.UNAUTHORIZED).json({
          error: 'Invalid signature',
        });
      }

      const { data, type } = req.body;

      if (type === 'payment' && data?.id) {
        await this.ProcessPaymentNotification(data.id);
      }

      return res.status(HttpStatus.OK).json({ success: true });
    } catch (error) {
      this.logger.error('Erro ao processar webhook:', error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Webhook processing failed',
      });
    }
  }

  private ValidateSignature(
    signature: string,
    requestId: string,
    dataId: string,
  ): boolean {
    try {
      const parts = signature.split(',');
      let ts = '';
      let hash = '';

      parts.forEach((part) => {
        const [key, value] = part.split('=');

        if (key && value) {
          if (key.trim() === 'ts') ts = value;
          if (key.trim() === 'v1') hash = value;
        }
      });

      if (!ts || !hash) {
        this.logger.warn('Formato de assinatura inválido');
        return false;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const requestTime = parseInt(ts);
      const timeDiff = Math.abs(currentTime - requestTime);

      if (timeDiff > 300) {
        // 5 minutos de tolerância
        this.logger.warn(`Webhook com timestamp expirado. Diff: ${timeDiff}s`);
        return false;
      }

      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      const secret = this.mercadoPagoConfiguration.webhookSecret;
      const expectedHash = crypto
        .createHmac('sha256', secret)
        .update(manifest)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(hash),
        Buffer.from(expectedHash),
      );
    } catch (error) {
      this.logger.error('Erro ao validar assinatura:', error.message);
      return false;
    }
  }

  private async ProcessPaymentNotification(paymentId: string) {
    try {
      const payment = await this.paymentApi.get({ id: paymentId });

      this.logger.log('Pagamento encontrado:', JSON.stringify(payment));

      const orderId = payment.external_reference;
      const status = payment.status;

      const order = await this.ordersRepository.findOne({
        where: {
          id: orderId,
        },
        relations: ['orderItems, orderItems.product'],
      });

      if (!order) {
        throw new NotFoundException(
          `Pedido ${orderId} não encontrado. Webhook`,
        );
      }

      switch (status) {
        case 'approved':
          await this.HandleApprovedPayment(order);

        case 'rejected':
        case 'cancelled':
          await this.HandleRejectedPayment(order, status);

        case 'pending':
          await this.HandlePendingPayment(order);

        case 'in_process':
          await this.HandleInProcessPayment(order);

        default:
          this.logger.warn(`Status desconhecido: ${status}`);
      }
    } catch (error) {
      this.logger.error('Erro ao processar notificação de pagamento:', error);
      throw error;
    }
  }

  private async HandleApprovedPayment(order: Order) {
    if (order.status === OrderStatus.APPROVED) {
      this.logger.log(`Pedido ${order.id} já foi processado anteriormente`);
      return;
    }

    try {
      await this.ordersRepository.update(order.id, {
        status: OrderStatus.APPROVED,
        paidAt: new Date(),
      });

      this.logger.log(`✅ Pedido ${order.id} aprovado e estoque reduzido`);

      // Aqui você pode adicionar:
      // - Enviar email de confirmação
      // - Notificar sistema de fulfillment
      // - Gerar nota fiscal
    } catch (error) {
      this.logger.error(
        `Erro ao processar pedido aprovado ${order.id}:`,
        error,
      );
      throw error;
    }
  }

  private async HandleRejectedPayment(order: Order, status: string) {
    if (
      order.status === OrderStatus.REJECTED ||
      order.status === OrderStatus.CANCELED
    ) {
      this.logger.log(`Pedido ${order.id} já foi cancelado anteriormente`);
      return;
    }

    try {
      let newStatus: OrderStatus;

      if (status === 'rejected') {
        newStatus = OrderStatus.REJECTED;
      } else {
        newStatus = OrderStatus.CANCELED;
      }

      await this.ordersRepository.update(order.id, {
        status: newStatus,
      });

      order.items.forEach(async (item) => {
        const findProduct = await this.productsRepository.findOneBy({
          id: item.product.id,
        });

        if (!findProduct) {
          throw new NotFoundException(
            `Produto ${item.product_name} não encontrado para ser devolvido ao estoque`,
          );
        }

        const updatedProductQuantity = (findProduct.quantity += item.quantity);

        const updateProductQuantity = await this.productsRepository.update(
          findProduct.id,
          {
            quantity: updatedProductQuantity,
          },
        );

        if (!updateProductQuantity || updateProductQuantity.affected < 1) {
          throw new InternalServerErrorException(
            `Erro ao tentar devolver unidades de produto ${item.quantity} ao estoque`,
          );
        }
      });

      this.logger.log(`❌ Pedido ${order.id} ${newStatus} - estoque liberado`);
    } catch (error) {
      this.logger.error(
        `Erro ao processar pedido rejeitado ${order.id}:`,
        error,
      );
      throw error;
    }
  }

  private async HandlePendingPayment(order: Order) {
    if (order.status === OrderStatus.WAITING_PAYMENT) return;

    await this.ordersRepository.update(order.id, {
      status: OrderStatus.WAITING_PAYMENT,
    });

    this.logger.log(`⏳ Pedido ${order.id} aguardando pagamento`);
  }

  private async HandleInProcessPayment(order: Order): Promise<void> {
    if (order.status === OrderStatus.IN_PROCESS) return;

    await this.ordersRepository.update(order.id, {
      status: OrderStatus.IN_PROCESS,
    });

    this.logger.log(`🔄 Pedido ${order.id} em processamento`);
  }
}
