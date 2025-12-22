import { Module } from '@nestjs/common';
import { OrdersModule } from 'src/orders/order.module';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
  imports: [OrdersModule],
})
export class EmailModule {}
