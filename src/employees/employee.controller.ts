import { Controller } from '@nestjs/common';
import { EmployeesService } from './employee.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}
}
