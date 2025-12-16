import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import * as mercadopago from 'mercadopago';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { Order } from 'src/orders/entities/order.entity';
import { OrdersService } from 'src/orders/order.service';
import { Product } from 'src/products/entities/product.entity';
import { Repository } from 'typeorm';
import mercadopagoConfig from './config/mercadopago.config';
import { OrderDTO } from './dto/order.dto';
import { RefundDTO } from './dto/refund.dto';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private client: mercadopago.MercadoPagoConfig;
  private preference: mercadopago.Preference;
  private paymentClient: mercadopago.Payment;
  private paymentRefundClient: mercadopago.PaymentRefund;

  constructor(
    @Inject(mercadopagoConfig.KEY)
    private readonly mercadoPagoConfiguration: ConfigType<
      typeof mercadopagoConfig
    >,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly ordersService: OrdersService,
  ) {
    this.client = new mercadopago.MercadoPagoConfig({
      accessToken: mercadoPagoConfiguration.accessToken,
      options: { timeout: 5000 },
    });

    this.paymentClient = new mercadopago.Payment(this.client);

    this.paymentRefundClient = new mercadopago.PaymentRefund(this.client);

    this.preference = new mercadopago.Preference(this.client);
  }

  async RefundOrder(
    orderId: string,
    refundDTO: RefundDTO,
    tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const findOrder = await this.ordersService.FindById(orderId);

    if (
      findOrder.user.id !== tokenPayloadDTO.sub &&
      !tokenPayloadDTO.role?.includes('admin')
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para estornar este pedido',
      );
    }

    this.ValidateRefundEligibility(findOrder);

    const idmptKey = randomUUID();

    try {
      const refund = await this.paymentRefundClient.create({
        payment_id: findOrder.paymentId,
        body: {
          amount: refundDTO.amount,
        },
        requestOptions: {
          idempotencyKey: idmptKey,
        },
      });

      this.logger.log(`Estorno criado no MP: ${refund.id}`);

      findOrder.items.forEach(async (item) => {
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
            `Erro ao tentar devolver unidades de produto ${item.product_name} ao estoque`,
          );
        }
      });

      await this.ordersRepository.update(orderId, {
        status: OrderStatus.REFUNDED,
        refundedAt: new Date(),
        refundReason: refundDTO.reasonCode,
      });

      this.logger.log(`✅ Estorno total processado: Order ${orderId}`);

      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        orderId,
      };
    } catch (error) {
      this.logger.error('Erro ao processar estorno no MP:', error);
      throw new BadRequestException(this.translateMPError(error.message));
    }
  }

  async RefundOrderPartial(
    orderId: string,
    refundDTO: RefundDTO,
    tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const findOrder = await this.ordersService.FindById(orderId);

    if (
      findOrder.user.id !== tokenPayloadDTO.sub &&
      !tokenPayloadDTO.role?.includes('admin')
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para estornar este pedido',
      );
    }

    this.ValidateRefundEligibility(findOrder);

    const idmptKey = randomUUID();

    try {
      const refund = await this.paymentRefundClient.create({
        payment_id: findOrder.paymentId,
        body: {
          amount: refundDTO.amount,
        },
        requestOptions: {
          idempotencyKey: idmptKey,
        },
      });

      const decimal = new Decimal(refundDTO.amount);

      await this.ordersRepository.update(findOrder.id, {
        status: OrderStatus.PARTIAL_REFUND,
        refundAmount: decimal.toString(),
        refundReason: refundDTO.reasonCode,
      });

      // Email
      // await this.emailService.sendPartialRefundEmail(order, refundDto.amount!);

      this.logger.log(
        `✅ Estorno parcial processado: Order ${orderId} - R$ ${refundDTO.amount}`,
      );

      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        orderId,
      };
    } catch (error) {
      this.logger.error('Erro no estorno parcial:', error);
      throw new BadRequestException(this.translateMPError(error.message));
    }
  }

  private ValidateRefundEligibility(order: Order) {
    if (order.status !== OrderStatus.APPROVED) {
      throw new BadRequestException('Só é possível estornar pedidos aprovados');
    }

    const daysSincePaid = Math.floor(
      (Date.now() - order.paidAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSincePaid > 180) {
      throw new BadRequestException(
        'Prazo para estorno expirado (máximo 180 dias)',
      );
    }
  }

  async CreatePreference(orderDTO: OrderDTO, tokenPayloadDTO: TokenPayloadDTO) {
    const { orderItems } = orderDTO;

    const createOrder = await this.ordersService.Create(
      orderItems,
      tokenPayloadDTO,
    );

    const preferenceBody = {
      ...createOrder,
      back_urls: {
        success: 'https://jubela-ecommerce.vercel.app/success',
        pending: 'https://jubela-ecommerce.vercel.app/pending',
        failure: 'https://jubela-ecommerce.vercel.app/failure',
      },
      auto_return: 'approved',
      notification_url:
        this.mercadoPagoConfiguration.appUrlBackend +
        'checkout/webhooks/mercadopago',
      statement_descriptor: 'Jubela Ecommerce',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
    };

    const response = await this.preference.create({
      body: preferenceBody,
    });

    this.logger.debug('Resposta MP:' + JSON.stringify(response));
    return response;
  }

  private translateMPError(errorMessage: string): string {
    const errors = {
      payment_too_old_to_be_refunded:
        'Pagamento muito antigo para estorno (máx 180 dias)',
      refund_not_found: 'Estorno não encontrado',
      invalid_payment_status_to_refund:
        'Status do pagamento não permite estorno',
      insufficient_amount: 'Saldo insuficiente na conta Mercado Pago',
    };

    for (const [key, message] of Object.entries(errors)) {
      if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }

    return 'Erro ao processar operação no Mercado Pago';
  }
}
