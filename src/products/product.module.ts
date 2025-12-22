import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from 'src/email/email.module';
import { EmployeesModule } from 'src/employees/employee.module';
import { Product } from './entities/product.entity';
import { ProductsController } from './product.controller';
import { ProductsService } from './product.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), EmployeesModule, EmailModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
