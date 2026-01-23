import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SetRoutePolicy } from 'src/auth/decorators/set-route-policy.decorator';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { RoutePolicyGuard } from 'src/auth/guards/route-policy.guard';
import { TokenPayloadParam } from 'src/auth/params/token-payload.param';
import { EmployeeRole } from 'src/common/enums/employee-role.enum';
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
  @SetRoutePolicy(EmployeeRole.ADMIN)
  async Create(
    @TokenPayloadParam() tokenPayloadDTO: TokenPayloadDTO,
    @Body() body: any,
  ) {
    const createOrder = await this.ordersService.Create(
      body.createOrderItemDTO,
      tokenPayloadDTO,
      body.userId,
    );

    console.log(createOrder);

    return {
      ...createOrder,
    };
  }

  @Get('employees')
  @SetRoutePolicy(EmployeeRole.READ_ORDERS)
  async ListOrders() {
    const allOrders = await this.ordersService.ListOrdersEmployees();

    if (allOrders.length < 1) {
      return {
        status: HttpStatus.NO_CONTENT,
        message: 'Nenhum pedido realizado ainda',
      };
    }

    return allOrders;
  }

  @Get()
  async ListOrdersUsers(@TokenPayloadParam() tokenPayloadDTO: TokenPayloadDTO) {
    const allOrders = await this.ordersService.ListOrdersUsers(tokenPayloadDTO);

    if (allOrders.length < 1) {
      return {
        status: HttpStatus.NO_CONTENT,
        message: 'Nenhum pedido realizado ainda',
      };
    }

    return allOrders;
  }

  @Get('search/price/employees')
  @SetRoutePolicy(EmployeeRole.READ_ORDERS)
  FindByPriceEmployees(@Query() paginationByPriceDTO: PaginationByPriceDTO) {
    return this.ordersService.FindByPriceEmployees(paginationByPriceDTO);
  }

  @Get('search/price/users')
  FindByPriceUsers(
    @Query() paginationByPriceDTO: PaginationByPriceDTO,
    @TokenPayloadParam() tokenPayloadDTO: TokenPayloadDTO,
  ) {
    return this.ordersService.FindByPriceUsers(
      paginationByPriceDTO,
      tokenPayloadDTO,
    );
  }

  @Get('search/item/employees')
  @SetRoutePolicy(EmployeeRole.READ_ORDERS)
  FindByItemEmployees(@Query() paginationDTO: PaginationDTO) {
    return this.ordersService.FindByItemEmployees(paginationDTO);
  }

  @Get('search/item/users')
  FindByItem(
    @Query() paginationDTO: PaginationDTO,
    @TokenPayloadParam() tokenPayloadDTO: TokenPayloadDTO,
  ) {
    return this.ordersService.FindByItemUsers(paginationDTO, tokenPayloadDTO);
  }

  @Get('search/user')
  @SetRoutePolicy(EmployeeRole.READ_ORDERS)
  FindByUser(@Query() paginationByUserDTO: PaginationByUserDTO) {
    return this.ordersService.FindByUser(paginationByUserDTO);
  }

  @Get('search/status')
  @SetRoutePolicy(EmployeeRole.READ_ORDERS)
  FindByStatus(@Query() paginationByStatusDTO: PaginationByStatusDTO) {
    return this.ordersService.FindByStatus(paginationByStatusDTO);
  }
}
