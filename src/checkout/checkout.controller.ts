import {
  Body,
  Controller,
  Inject,
  Logger,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import MercadoPagoConfig, { Payment } from 'mercadopago';
import { CheckoutService } from './checkout.service';
import mercadopagoConfig from './config/mercadopago.config';
import { CreatePreferenceDto } from './dto/create-preference.dto';

@Controller('checkout')
export class CheckoutController {
  private readonly logger = new Logger(CheckoutService.name);
  private paymentApi: Payment;

  constructor(
    @Inject(mercadopagoConfig.KEY)
    private readonly mercadoPagoConfiguration: ConfigType<
      typeof mercadopagoConfig
    >,
    private readonly checkoutService: CheckoutService,
  ) {
    const client = new MercadoPagoConfig({
      accessToken: mercadoPagoConfiguration.accessToken,
    });

    this.paymentApi = new Payment(client);
  }

  @Post('preference')
  async create(@Body() preferenceDTO: CreatePreferenceDto) {
    const pref = await this.checkoutService.CreatePreference(preferenceDTO);
    return {
      id: pref.id,
      init_point: pref.init_point,
      // remover em prod
      sandbox_init_point: pref.sandbox_init_point,
    };
  }

  @Post('webhooks/mercadopago')
  async Handle(@Req() req: Request, @Res() res: Response) {
    try {
      const signature = req.headers['x-signature'] as string;
      const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);
      const secret = process.env.MP_WEBHOOK_SECRET!;

      // Validação HMAC
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('base64');

      if (
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
      ) {
        this.logger.warn('Assinatura inválida no webhook');
        return res.status(401).send('Invalid signature');
      }

      this.logger.log('Webhook recebido: ' + JSON.stringify(req.body));

      const { data, type } = req.body;

      // Exemplo: pagamento
      if (type === 'payment' && data?.id) {
        const payment = await this.paymentApi.get({ id: data.id });
        this.logger.log('Pagamento encontrado: ' + JSON.stringify(payment));

        // Aqui você atualiza o status do pedido no banco
      }

      res.status(200).send('OK');
    } catch (err) {
      this.logger.error(err);
      res.status(500).send('Webhook error');
    }
  }
}
