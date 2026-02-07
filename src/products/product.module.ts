import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { EmailModule } from 'src/email/email.module';
import { EmployeesModule } from 'src/employees/employee.module';
import { OrdersModule } from 'src/orders/order.module';
import { ProductImages } from './entities/product-images.entity';
import { Product } from './entities/product.entity';
import { ProductsController } from './product.controller';
import { ProductsService } from './product.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImages]),
    EmployeesModule,
    CloudinaryModule,
    forwardRef(() => EmailModule),
    forwardRef(() => OrdersModule),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
