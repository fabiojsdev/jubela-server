import { forwardRef, Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from 'src/email/email.module';
import { Product } from 'src/products/entities/product.entity';
import { ProductsModule } from 'src/products/product.module';
import { UsersModule } from 'src/users/user.module';
import { Items } from './entities/items.entity';
import { Order } from './entities/order.entity';
import { OrdersController } from './order.controller';
import { OrdersService } from './order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Items, Product]),
    UsersModule,
    forwardRef(() => ProductsModule),
    forwardRef(() => EmailModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, Logger],
  exports: [TypeOrmModule.forFeature([Order, Items]), OrdersService],
})
export class OrdersModule {}
