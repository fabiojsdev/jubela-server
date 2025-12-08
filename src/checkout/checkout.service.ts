import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as mercadopago from 'mercadopago';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { OrdersService } from 'src/orders/order.service';
import mercadopagoConfig from './config/mercadopago.config';
import { OrderDTO } from './dto/order.dto';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private client: mercadopago.MercadoPagoConfig;
  private preference: mercadopago.Preference;

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

    this.preference = new mercadopago.Preference(this.client);
  }

  async CreatePreference(orderDTO: OrderDTO, tokenPayloadDTO: TokenPayloadDTO) {
    const { order, orderItems } = orderDTO;

    const createOrder = await this.ordersService.Create(
      order,
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
        this.mercadoPagoConfiguration.appUrlBackend + '/webhooks/mercadopago',
    };

    const response = await this.preference.create({
      body: preferenceBody,
    });

    this.logger.debug('Resposta MP:' + JSON.stringify(response));
    return response;
  }
}
