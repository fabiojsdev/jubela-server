import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/products/entities/product.entity';
import { UsersModule } from 'src/users/user.module';
import { Items } from './entities/items.entity';
import { Order } from './entities/order.entity';
import { OrdersController } from './order.controller';
import { OrdersService } from './order.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Items, Product]), UsersModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
