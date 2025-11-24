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
import { ReqBodyCpfValidation } from 'src/common/pipes/cpf-validation-body-request.pipe';
import { ReqBodyPhoneNumberValidation } from 'src/common/pipes/phone-number-validation-body-request.pipe';
import { FindByPhoneNumberValidation } from 'src/common/pipes/phone-number-validation.pipe';
import { CreateEmployeeDTO } from './dto/create-employee.dto';
import { PaginationByNameDTO } from './dto/pagination-employee-name.dto';
import { PaginationByRoleDTO } from './dto/pagination-employee-role.dto';
import { SearchByEmailDTO } from './dto/search-email-employee.dto';
import { UpdateEmployeeAdminDTO } from './dto/update-employee-admin.dto';
import { EmployeeUpdateUuidDTO } from './dto/update-employee-uuid.dto';
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
    @Param('id') id: EmployeeUpdateUuidDTO,
    @Body() updateEmployeeDTO: UpdateEmployeeDTO,
  ) {
    return this.employeesService.UpdateSelf(id, updateEmployeeDTO);
  }

  @Patch('update/admin/:id')
  @UsePipes(ReqBodyCpfValidation, ReqBodyPhoneNumberValidation)
  UpdateAdmin(
    @Param('id') id: EmployeeUpdateUuidDTO,
    @Body() updateEmployeeAdminDTO: UpdateEmployeeAdminDTO,
  ) {
    return this.employeesService.UpdateAdmin(id, updateEmployeeAdminDTO);
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
