import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateEmployeeDTO } from './dto/create-employee.dto';
import { PaginationDTO } from './dto/pagination-employee.dto';
import { UpdateEmployeeAdminDTO } from './dto/update-employee-admin.dto';
import { UpdateEmployeeDTO } from './dto/update-employee.dto';
import { EmployeesService } from './employee.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  Create(@Body() body: CreateEmployeeDTO) {
    return this.employeesService.Create(body);
  }

  @Patch('update/self/:id')
  UpdateSelf(
    @Param('id') id: string,
    @Body() updateEmployeeDTO: UpdateEmployeeDTO,
  ) {
    return this.employeesService.UpdateSelf(id, updateEmployeeDTO);
  }

  @Patch('update/admin/:id')
  UpdateAdmin(
    @Param('id') id: string,
    @Body() updateEmployeeAdminDTO: UpdateEmployeeAdminDTO,
  ) {
    return this.employeesService.UpdateAdmin(id, updateEmployeeAdminDTO);
  }

  @Get('search/email/:email')
  FindByEmail(@Param('email') email: string) {
    return this.employeesService.FindByEmail(email);
  }

  @Get('search/phoneNumber/:phoneNumber')
  FindByPhoneNumber(@Param('phoneNumber') phoneNumber: string) {
    return this.employeesService.FindByPhoneNumber(phoneNumber);
  }

  @Get('search/name/')
  FindByName(@Query() paginationDto: PaginationDTO) {
    return this.employeesService.FindByName(paginationDto);
  }

  @Get('search/role/')
  FindByRole(@Query() paginationDto: PaginationDTO) {
    return this.employeesService.FindByRole(paginationDto);
  }
}
