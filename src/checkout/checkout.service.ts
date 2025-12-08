import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as mercadopago from 'mercadopago';
import mercadopagoConfig from './config/mercadopago.config';
import { CreatePreferenceDto } from './dto/create-preference.dto';

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
  ) {
    this.client = new mercadopago.MercadoPagoConfig({
      accessToken: mercadoPagoConfiguration.accessToken,
      options: { timeout: 5000 },
    });

    this.preference = new mercadopago.Preference(this.client);
  }

  async CreatePreference(preferenceDTO: CreatePreferenceDto) {
    const preferenceBody = {
      ...preferenceDTO,
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
