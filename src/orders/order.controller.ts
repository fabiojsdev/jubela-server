import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
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

  @Get()
  async ListOrders(@TokenPayloadParam() tokenPayloadDTO: TokenPayloadDTO) {
    const allOrders = await this.ordersService.ListOrders(tokenPayloadDTO);

    if (allOrders.length < 1) {
      return {
        status: HttpStatus.NO_CONTENT,
        message: 'Nenhum produto cadastrado ainda',
      };
    }

    return allOrders;
  }

  @Get('search/price')
  FindByPrice(
    @Query() paginationByPriceDTO: PaginationByPriceDTO,
    @TokenPayloadParam() tokenPayloadDTO: TokenPayloadDTO,
  ) {
    return this.ordersService.FindByPrice(
      paginationByPriceDTO,
      tokenPayloadDTO,
    );
  }

  @Get('search/item')
  FindByItem(
    @Query() paginationDTO: PaginationDTO,
    @TokenPayloadParam() tokenPayloadDTO: TokenPayloadDTO,
  ) {
    return this.ordersService.FindByItem(paginationDTO, tokenPayloadDTO);
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
