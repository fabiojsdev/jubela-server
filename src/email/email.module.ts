import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { OrdersModule } from 'src/orders/order.module';
import { EmailControllerTemp } from './email.controller';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  controllers: [EmailControllerTemp],
  exports: [EmailService],
  imports: [TypeOrmModule.forFeature([Order]), forwardRef(() => OrdersModule)],
})
export class EmailModule {}
