import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateOrderDTO } from './dto/create-order.dto';
import { PaginationByPriceDTO } from './dto/pagination-by-price.dto';
import { PaginationByUserDTO } from './dto/pagination-by-user.dto';
import { PaginationByStatusDTO } from './dto/pagination-order-status.dto';
import { PaginationDTO } from './dto/pagination-order.dto';
import { OrdersService } from './order.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  Create(@Body() body: CreateOrderDTO) {
    return this.ordersService.Create(body);
  }

  @Get('search/price')
  FindByPrice(@Query() paginationByPriceDTO: PaginationByPriceDTO) {
    return this.ordersService.FindByPrice(paginationByPriceDTO);
  }

  @Get('search/item')
  FindByItem(@Query() paginationDTO: PaginationDTO) {
    return this.ordersService.FindByItem(paginationDTO);
  }

  @Get('search/user')
  FindByUser(@Query() paginationByUserDTO: PaginationByUserDTO) {
    return this.ordersService.FindByUser(paginationByUserDTO);
  }

  @Get('search/status')
  FindByStatus(@Query() paginationByStatusDTO: PaginationByStatusDTO) {
    return this.ordersService.FindByStatus(paginationByStatusDTO);
  }
}
