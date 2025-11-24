import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PaginationByNameDTO } from 'src/common/dto/pagination-name.dto';
import { UpdateUuidDTO } from 'src/common/dto/update-uuid.dto';
import { CreateProductDTO } from './dto/create-product.dto';
import { PaginationByEmployeeDTO } from './dto/pagination-by-employee.dto';
import { PaginationDTO } from './dto/pagination-product.dto';
import { UpdateProductDTO } from './dto/update-product.dto';
import { ProductsService } from './product.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  Create(@Body() body: CreateProductDTO) {
    return this.productsService.Create(body);
  }

  @Patch('update/:id')
  Update(
    @Param('id') id: UpdateUuidDTO,
    @Body() updateProductDTO: UpdateProductDTO,
  ) {
    return this.productsService.Update(id, updateProductDTO);
  }

  @Get('search/sku/:sku')
  FindBySku(@Param('sku') sku: string) {
    return this.productsService.FindBySku(sku);
  }

  @Get('search/name/')
  FindByName(@Query() paginationByNameDto: PaginationByNameDTO) {
    return this.productsService.FindByName(paginationByNameDto);
  }

  @Get('search/category/')
  FindByRole(@Query() paginationDto: PaginationDTO) {
    return this.productsService.FindByCategory(paginationDto);
  }

  @Get('search/employee/')
  FindByEmployee(@Query() paginationByEmployeeDto: PaginationByEmployeeDTO) {
    return this.productsService.FindByEmployee(paginationByEmployeeDto);
  }
}
