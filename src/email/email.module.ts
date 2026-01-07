import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { OrdersModule } from 'src/orders/order.module';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
  imports: [TypeOrmModule.forFeature([Order]), forwardRef(() => OrdersModule)],
})
export class EmailModule {}
