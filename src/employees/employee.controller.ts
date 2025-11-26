import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { TokenPayloadParam } from 'src/auth/params/token-payload.param';
import { PaginationByNameDTO } from 'src/common/dto/pagination-name.dto';
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

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
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
  FindByEmail(@Param('email') email: SearchByEmailDTO) {
    return this.employeesService.FindByEmail(email);
  }

  @Get('search/phoneNumber/:phoneNumber')
  @UsePipes(FindByPhoneNumberValidation)
  FindByPhoneNumber(@Param('phoneNumber') phoneNumber: string) {
    return this.employeesService.FindByPhoneNumber(phoneNumber);
  }

  @Get('search/name/')
  FindByName(@Query() paginationByNameDto: PaginationByNameDTO) {
    return this.employeesService.FindByName(paginationByNameDto);
  }

  @Get('search/role/')
  FindByRole(@Query() paginationByRoleDto: PaginationByRoleDTO) {
    return this.employeesService.FindByRole(paginationByRoleDto);
  }
}
