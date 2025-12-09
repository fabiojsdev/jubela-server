import {
  Body,
  Controller,
  Inject,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Post,
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
    private readonly checkoutService: CheckoutService,
  ) {
    const client = new MercadoPagoConfig({
      accessToken: mercadoPagoConfiguration.accessToken,
    });

    this.paymentApi = new Payment(client);
  }

  @Post('preference')
  async create(
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

        const orderId = payment.external_reference;
        const status = payment.status;
        let sendStatus: OrderStatus;

        switch (status) {
          case 'approved':
            sendStatus = OrderStatus.APPROVED;
            break;
          case 'pending':
            sendStatus = OrderStatus.WAITING_PAYMENT;
            break;
          case 'in_process':
            sendStatus = OrderStatus.IN_PROCESS;
            break;
          case 'rejected':
            sendStatus = OrderStatus.REJECTED;
            break;
          case 'canceled':
            sendStatus = OrderStatus.CANCELED;
            break;
        }

        if (status === '') {
          throw new InternalServerErrorException(
            'Erro ao atualizar status do pedido. Webhook',
          );
        }

        const updateOrder = await this.ordersRepository.update(orderId, {
          status: sendStatus,
        });

        if (!updateOrder) {
          throw new NotFoundException('Pedido não encontrado. Webhook');
        }
      }

      res.status(200).send('OK');
    } catch (err) {
      this.logger.error(err);
      res.status(500).send('Webhook error');
    }
  }
}
