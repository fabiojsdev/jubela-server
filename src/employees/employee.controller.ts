import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { SetRoutePolicy } from 'src/auth/decorators/set-route-policy.decorator';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { RoutePolicyGuard } from 'src/auth/guards/route-policy.guard';
import { TokenPayloadParam } from 'src/auth/params/token-payload.param';
import { PaginationByNameDTO } from 'src/common/dto/pagination-name.dto';
import { EmployeeRole } from 'src/common/enums/employee-role.enum';
import { ReqBodyCpfValidation } from 'src/common/pipes/cpf-validation-body-request.pipe';
import { ReqBodyPhoneNumberValidation } from 'src/common/pipes/phone-number-validation-body-request.pipe';
import { FindByPhoneNumberValidation } from 'src/common/pipes/phone-number-validation.pipe';
import { UpdateUuidDTO } from '../common/dto/update-uuid.dto';
import { CreateEmployeeDTO } from './dto/create-employee.dto';
import { PaginationByRoleDTO } from './dto/pagination-employee-role.dto';
import { SearchByEmailDTO } from './dto/search-email-employee.dto';
import { UpdateEmployeeAdminDTO } from './dto/update-employee-admin.dto';
import { UpdateEmployeeDTO } from './dto/update-employee.dto';
import { EmployeesService } from './employee.service';

@UseGuards(RoutePolicyGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @SetRoutePolicy(EmployeeRole.ADMIN)
  @UsePipes(ReqBodyCpfValidation, ReqBodyPhoneNumberValidation)
  Create(@Body() body: CreateEmployeeDTO) {
    return this.employeesService.Create(body);
  }

  @Patch('update/self/:id')
  @UsePipes(ReqBodyCpfValidation, ReqBodyPhoneNumberValidation)
  UpdateSelf(
    @Param('id') id: UpdateUuidDTO,
    @Body() updateEmployeeDTO: UpdateEmployeeDTO,
    @TokenPayloadParam() TokenPayloadDTO: TokenPayloadDTO,
  ) {
    return this.employeesService.UpdateSelf(
      id,
      updateEmployeeDTO,
      TokenPayloadDTO,
    );
  }

  @Patch('update/admin/:id')
  @SetRoutePolicy(EmployeeRole.ADMIN)
  @UsePipes(ReqBodyCpfValidation, ReqBodyPhoneNumberValidation)
  UpdateAdmin(
    @Param('id') id: UpdateUuidDTO,
    @Body() updateEmployeeAdminDTO: UpdateEmployeeAdminDTO,
    @TokenPayloadParam() tokenPayloadDTO: TokenPayloadDTO,
  ) {
    return this.employeesService.UpdateAdmin(
      id,
      updateEmployeeAdminDTO,
      tokenPayloadDTO,
    );
  }

  @Get('search/email/:email')
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindByEmail(@Param('email') email: SearchByEmailDTO) {
    return this.employeesService.FindByEmail(email);
  }

  @Get('search/phoneNumber/:phoneNumber')
  @SetRoutePolicy(EmployeeRole.ADMIN)
  @UsePipes(FindByPhoneNumberValidation)
  FindByPhoneNumber(@Param('phoneNumber') phoneNumber: string) {
    return this.employeesService.FindByPhoneNumber(phoneNumber);
  }

  @Get('search/name/')
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindByName(@Query() paginationByNameDto: PaginationByNameDTO) {
    return this.employeesService.FindByName(paginationByNameDto);
  }

  @Get('search/role/')
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindByRole(@Query() paginationByRoleDto: PaginationByRoleDTO) {
    return this.employeesService.FindByRole(paginationByRoleDto);
  }
}
