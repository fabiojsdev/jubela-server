import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateOrderDTO } from './dto/create-order.dto';
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
  FindByPrice(@Query() paginationDTO: PaginationDTO) {
    return this.ordersService.FindByPrice(paginationDTO);
  }

  @Get('search/item')
  FindByItem(@Query() paginationDTO: PaginationDTO) {
    return this.ordersService.FindByItem(paginationDTO);
  }

  @Get('search/user')
  FindByUser(@Query() paginationDTO: PaginationDTO) {
    return this.ordersService.FindByUser(paginationDTO);
  }
}
