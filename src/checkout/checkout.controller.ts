import {
  Body,
  Controller,
  HttpStatus,
  Inject,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import MercadoPagoConfig, { Payment } from 'mercadopago';
import { Public } from 'src/auth/decorators/set-metadata.decorator';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { TokenPayloadParam } from 'src/auth/params/token-payload.param';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { EmailService } from 'src/email/email.service';
import { Order } from 'src/orders/entities/order.entity';
import { Product } from 'src/products/entities/product.entity';
import { DataSource, Repository } from 'typeorm';
import { CheckoutService } from './checkout.service';
import mercadopagoConfig from './config/mercadopago.config';
import { CancelDTO } from './dto/cancel.dto';
import { OrderDTO } from './dto/order.dto';
import { PartialRefundDTO } from './dto/partial-refund.dto';
import { RefundDTO } from './dto/refund.dto';

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
    private readonly checkoutService: CheckoutService,
    private readonly emaillSerive: EmailService,
    private dataSource: DataSource,
  ) {
    const client = new MercadoPagoConfig({
      accessToken: mercadoPagoConfiguration.accessToken,
    });

    this.paymentApi = new Payment(client);
  }

  @SkipThrottle({ read: true, auth: true })
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

  @SkipThrottle({ read: true, auth: true })
  @Post('orders/:orderId/refund')
  async RefundOrder(
    @Param('orderId') orderId: string,
    @Body() refundDto: RefundDTO,
    @TokenPayloadParam() tokenPayload: TokenPayloadDTO,
  ) {
    try {
      const result = await this.checkoutService.RefundOrder(
        orderId,
        refundDto,
        tokenPayload,
      );

      return {
        success: true,
        message: 'Estorno processado com sucesso',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Erro ao processar estorno: ${error.message}`);
      throw error;
    }
  }

  @SkipThrottle({ read: true, auth: true })
  @Post('orders/:orderId/refund-partial')
  async RefundPartial(
    @Param('orderId') orderId: string,
    @Body() partialRefunDTO: PartialRefundDTO,
    @TokenPayloadParam() tokenPayload: TokenPayloadDTO,
  ) {
    try {
      const result = await this.checkoutService.RefundOrderPartial(
        orderId,
        partialRefunDTO,
        tokenPayload,
      );

      return {
        success: true,
        message: 'Estorno parcial processado com sucesso',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Erro ao processar estorno parcial: ${error.message}`);
      throw error;
    }
  }

  @SkipThrottle({ read: true, auth: true })
  @Patch('orders/:orderId/cancel')
  async CancelOrder(
    @Param('orderId') orderId: string,
    @Body() cancelDto: CancelDTO,
    @TokenPayloadParam() tokenPayload: TokenPayloadDTO,
  ) {
    try {
      const result = await this.checkoutService.CancelOrder(
        orderId,
        cancelDto,
        tokenPayload,
      );

      return {
        success: true,
        message: 'Pedido cancelado com sucesso',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Erro ao cancelar pedido: ${error.message}`);
      throw error;
    }
  }

  @SkipThrottle({ read: true, auth: true })
  @Public()
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
        relations: {
          items: true,
        },
        select: {
          items: {
            product: true,
          },
        },
      });

      if (!order) {
        throw new NotFoundException(
          `Pedido ${orderId} não encontrado. Webhook`,
        );
      }

      await this.ordersRepository.update(orderId, {
        paymentId: payment.id.toString(),
      });

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

      await this.emaillSerive.SendPaymentApprovedEmail(order, false);
      await this.emaillSerive.SendPaymentApprovedEmail(order, true);
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

      const updateOrderStatus = await this.ordersRepository.update(order.id, {
        status: newStatus,
      });

      if (!updateOrderStatus || updateOrderStatus.affected < 1) {
        throw new InternalServerErrorException(
          `Erro ao atualizar pedido ${order.id}`,
        );
      }

      for (const item of order.items) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const findProduct = await queryRunner.manager.findOne(Product, {
            where: {
              id: item.product.id,
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (!findProduct) {
            throw new NotFoundException(
              `Produto ${item.product_name} não encontrado para ser devolvido ao estoque`,
            );
          }

          const updatedProductQuantity = (findProduct.quantity +=
            item.quantity);

          const updateProductQuantity = await queryRunner.manager.update(
            Product,
            findProduct.id,
            {
              quantity: updatedProductQuantity,
            },
          );

          if (!updateProductQuantity || updateProductQuantity.affected < 1) {
            throw new InternalServerErrorException(
              `Erro ao tentar devolver unidades de produto ${item.product_name} ao estoque`,
            );
          }

          await queryRunner.commitTransaction();
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      }

      this.logger.log(`❌ Pedido ${order.id} ${newStatus} - estoque liberado`);

      await this.emaillSerive.SendPaymentRejectedEmail(order, false);
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

    // await this.emaillSerive.SendPaymentPendingEmail(order, false);

    this.logger.log(`🔄 Pedido ${order.id} em processamento`);
  }
}
