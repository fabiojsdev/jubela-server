import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SetRoutePolicy } from 'src/auth/decorators/set-route-policy.decorator';
import { RoutePolicyGuard } from 'src/auth/guards/route-policy.guard';
import { PaginationByNameDTO } from 'src/common/dto/pagination-name.dto';
import { UpdateUuidDTO } from 'src/common/dto/update-uuid.dto';
import { EmployeeRole } from 'src/common/enums/employee-role.enum';
import { CreateProductDTO } from './dto/create-product.dto';
import { PaginationByEmployeeDTO } from './dto/pagination-by-employee.dto';
import { PaginationDTO } from './dto/pagination-product.dto';
import { UpdateProductDTO } from './dto/update-product.dto';
import { ProductsService } from './product.service';

@UseGuards(RoutePolicyGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @SetRoutePolicy(EmployeeRole.EDIT_PRODUCTS)
  @SetRoutePolicy(EmployeeRole.ADMIN)
  Create(@Body() body: CreateProductDTO) {
    return this.productsService.Create(body);
  }

  @Patch('update/:id')
  @SetRoutePolicy(EmployeeRole.EDIT_PRODUCTS)
  @SetRoutePolicy(EmployeeRole.ADMIN)
  Update(
    @Param('id') id: UpdateUuidDTO,
    @Body() updateProductDTO: UpdateProductDTO,
  ) {
    return this.productsService.Update(id, updateProductDTO);
  }

  @Get('search/sku/:sku')
  @SetRoutePolicy(EmployeeRole.EDIT_PRODUCTS)
  @SetRoutePolicy(EmployeeRole.READ_PRODUCTS)
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindBySku(@Param('sku') sku: string) {
    return this.productsService.FindBySku(sku);
  }

  @Get('search/name/')
  @SetRoutePolicy(EmployeeRole.EDIT_PRODUCTS)
  @SetRoutePolicy(EmployeeRole.READ_PRODUCTS)
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindByName(@Query() paginationByNameDto: PaginationByNameDTO) {
    return this.productsService.FindByName(paginationByNameDto);
  }

  @Get('search/category/')
  @SetRoutePolicy(EmployeeRole.EDIT_PRODUCTS)
  @SetRoutePolicy(EmployeeRole.READ_PRODUCTS)
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindByRole(@Query() paginationDto: PaginationDTO) {
    return this.productsService.FindByCategory(paginationDto);
  }

  @Get('search/employee/')
  @SetRoutePolicy(EmployeeRole.EDIT_PRODUCTS)
  @SetRoutePolicy(EmployeeRole.READ_PRODUCTS)
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindByEmployee(@Query() paginationByEmployeeDto: PaginationByEmployeeDTO) {
    return this.productsService.FindByEmployee(paginationByEmployeeDto);
  }
}
