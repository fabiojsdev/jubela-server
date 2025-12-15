import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as mercadopago from 'mercadopago';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { Order } from 'src/orders/entities/order.entity';
import { OrdersService } from 'src/orders/order.service';
import mercadopagoConfig from './config/mercadopago.config';
import { OrderDTO } from './dto/order.dto';

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
    refundDTO: any,
    tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const findOrder = await this.ordersService.FindById(orderId);

    if (
      findOrder.user.id !== tokenPayloadDTO.sub &&
      !tokenPayloadDTO.role?.includes('admin')
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este pedido',
      );
    }

    this.ValidateRefundEligibility(findOrder);
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
}
