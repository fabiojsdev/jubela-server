import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { OrdersModule } from 'src/orders/order.module';
import emailConfig from './config/email.config';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
  imports: [
    TypeOrmModule.forFeature([Order]),
    ConfigModule.forFeature(emailConfig),
    forwardRef(() => OrdersModule),
  ],
})
export class EmailModule {}
