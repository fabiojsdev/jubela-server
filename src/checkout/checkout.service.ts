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
