import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeDTO } from './create-employee.dto';

export class UpdateEmployeeDTO extends PartialType(CreateEmployeeDTO) {}
