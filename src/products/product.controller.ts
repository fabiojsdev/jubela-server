import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateProductDTO } from './dto/create-product.dto';
import { PaginationDTO } from './dto/pagination-products.dto';
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
  Update(@Param('id') id: string, @Body() updateProductDTO: UpdateProductDTO) {
    return this.productsService.Update(id, updateProductDTO);
  }

  @Get('search/sku/:sku')
  FindBySku(@Param('sku') sku: string) {
    return this.productsService.FindBySku(sku);
  }

  @Get('search/name/')
  FindByName(@Query() paginationDto: PaginationDTO) {
    return this.productsService.FindByName(paginationDto);
  }

  @Get('search/category/')
  FindByRole(@Query() paginationDto: PaginationDTO) {
    return this.productsService.FindByCategory(paginationDto);
  }
}
