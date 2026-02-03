import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from 'src/email/email.module';
import { OrdersModule } from 'src/orders/order.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import mercadopagoConfig from './config/mercadopago.config';

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService],
  imports: [
    ConfigModule.forFeature(mercadopagoConfig),
    OrdersModule,
    EmailModule,
  ],
})
export class CheckoutModule {}
