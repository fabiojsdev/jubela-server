import { Type } from 'class-transformer';
import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { EmployeeRole } from 'src/common/enums/employee-role.enum';

export class PaginationByRoleDTO {
  @IsInt({
    message: 'Limite precisa ser um numero inteiro',
  })
  @Min(0, {
    message: 'Limite não pode ser menor que 0',
  })
  @Max(20, {
    message: 'Limite não pode ser maior que 20',
  })
  @Type(() => Number)
  limit: number;

  @IsInt({
    message: 'Offset precisa ser um numero inteiro',
  })
  @Min(0, {
    message: 'Offset não deve ser menor que 0',
  })
  @Type(() => Number)
  offset: number;

  @IsEnum(EmployeeRole, {
    message: 'Permissão inválida',
  })
  value: EmployeeRole;
}
