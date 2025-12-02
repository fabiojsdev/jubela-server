import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SetRoutePolicy } from 'src/auth/decorators/set-route-policy.decorator';
import { RoutePolicyGuard } from 'src/auth/guards/route-policy.guard';
import { EmployeeRole } from 'src/common/enums/employee-role.enum';
import { CreateOrderDTO } from './dto/create-order.dto';
import { PaginationByPriceDTO } from './dto/pagination-by-price.dto';
import { PaginationByUserDTO } from './dto/pagination-by-user.dto';
import { PaginationByStatusDTO } from './dto/pagination-order-status.dto';
import { PaginationDTO } from './dto/pagination-order.dto';
import { OrdersService } from './order.service';

@UseGuards(RoutePolicyGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @SetRoutePolicy(EmployeeRole.READ_ORDERS)
  @SetRoutePolicy(EmployeeRole.ADMIN)
  Create(@Body() body: CreateOrderDTO) {
    return this.ordersService.Create(body);
  }

  @Get('search/price')
  @SetRoutePolicy(EmployeeRole.READ_ORDERS)
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindByPrice(@Query() paginationByPriceDTO: PaginationByPriceDTO) {
    return this.ordersService.FindByPrice(paginationByPriceDTO);
  }

  @Get('search/item')
  @SetRoutePolicy(EmployeeRole.READ_ORDERS)
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindByItem(@Query() paginationDTO: PaginationDTO) {
    return this.ordersService.FindByItem(paginationDTO);
  }

  @Get('search/user')
  @SetRoutePolicy(EmployeeRole.READ_ORDERS)
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindByUser(@Query() paginationByUserDTO: PaginationByUserDTO) {
    return this.ordersService.FindByUser(paginationByUserDTO);
  }

  @Get('search/status')
  @SetRoutePolicy(EmployeeRole.READ_ORDERS)
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindByStatus(@Query() paginationByStatusDTO: PaginationByStatusDTO) {
    return this.ordersService.FindByStatus(paginationByStatusDTO);
  }
}
