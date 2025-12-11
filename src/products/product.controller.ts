import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Public } from 'src/auth/decorators/set-metadata.decorator';
import { SetRoutePolicy } from 'src/auth/decorators/set-route-policy.decorator';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { RoutePolicyGuard } from 'src/auth/guards/route-policy.guard';
import { TokenPayloadParam } from 'src/auth/params/token-payload.param';
import { PaginationByNameDTO } from 'src/common/dto/pagination-name.dto';
import { UrlUuidDTO } from 'src/common/dto/url-uuid.dto';
import { EmployeeRole } from 'src/common/enums/employee-role.enum';
import { CreateProductDTO } from './dto/create-product.dto';
import { PaginationAllProductsDTO } from './dto/pagination-all-products.dto';
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
  @UseInterceptors(FilesInterceptor('files', 4))
  Create(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 2_000_000 })
        .addFileTypeValidator({ fileType: /jpeg|jpg|png/g })
        .build(),
    )
    files: Array<Express.Multer.File>,

    @TokenPayloadParam()
    tokenPayloadDTO: TokenPayloadDTO,

    @Body() body: any,
  ) {
    const jsonData: CreateProductDTO = JSON.parse(body.data);

    return this.productsService.Create(jsonData, files, tokenPayloadDTO);
  }

  @Patch(':id')
  @SetRoutePolicy(EmployeeRole.EDIT_PRODUCTS)
  @UseInterceptors(FilesInterceptor('files', 4))
  Update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 2_000_000 })
        .addFileTypeValidator({ fileType: /jpeg|jpg|png/g })
        .build(),
    )
    files: Array<Express.Multer.File>,
  ) {
    const jsonData: UpdateProductDTO = JSON.parse(body.data);

    return this.productsService.Update(id, jsonData, files);
  }

  @Delete('images')
  @SetRoutePolicy(EmployeeRole.EDIT_PRODUCTS)
  async DeleteImages(@Body() body: any) {
    const deleteImage = await this.productsService.ImageDelete(
      body.images,
      body.productId,
    );
    return { success: true, message: deleteImage };
  }

  @Delete(':id')
  @SetRoutePolicy(EmployeeRole.EDIT_PRODUCTS)
  Delete(@Param('id') id: UrlUuidDTO) {
    this.productsService.Delete(id);
    return { success: true, message: 'Produto deletado' };
  }

  @Public()
  @Get()
  async ListProducts(
    @Query() paginationAllProductsDTO: PaginationAllProductsDTO,
  ) {
    const allProducts = await this.productsService.ListProducts(
      paginationAllProductsDTO,
    );

    if (allProducts.length < 1) {
      return {
        status: HttpStatus.NO_CONTENT,
        message: 'Nenhum produto cadastrado ainda',
      };
    }

    return allProducts;
  }

  @Get('search/sku/:sku')
  @SetRoutePolicy(EmployeeRole.READ_PRODUCTS)
  FindBySku(@Param('sku') sku: string) {
    return this.productsService.FindBySku(sku);
  }

  @Get('search/name/')
  @SetRoutePolicy(EmployeeRole.READ_PRODUCTS)
  FindByName(@Query() paginationByNameDto: PaginationByNameDTO) {
    return this.productsService.FindByName(paginationByNameDto);
  }

  @Get('search/category/')
  @SetRoutePolicy(EmployeeRole.READ_PRODUCTS)
  FindByRole(@Query() paginationDto: PaginationDTO) {
    return this.productsService.FindByCategory(paginationDto);
  }

  @Get('search/employee/')
  @SetRoutePolicy(EmployeeRole.READ_PRODUCTS)
  FindByEmployee(@Query() paginationByEmployeeDto: PaginationByEmployeeDTO) {
    return this.productsService.FindByEmployee(paginationByEmployeeDto);
  }
}
