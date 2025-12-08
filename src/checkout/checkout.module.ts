import { Module } from '@nestjs/common';
import { OrdersModule } from 'src/orders/order.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService],
  imports: [OrdersModule],
})
export class CheckoutModule {}
