import { IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { Employee } from 'src/employees/entities/employee.entity';

export class CreateProductDTO {
  @IsNotEmpty({
    message: 'O campo "nome" não preenchido',
  })
  @IsString({
    message: 'O campo "nome" deve estar no formato de texto',
  })
  readonly name: string;

  @IsNotEmpty({
    message: 'O campo "categoria" não preenchido',
  })
  @IsString({
    message: 'O campo "categoria" deve estar no formato de texto',
  })
  readonly category: string;

  @IsNotEmpty({
    message: 'O campo "descrição" não preenchido',
  })
  @IsString({
    message: 'O campo "descrição" deve estar no formato de texto',
  })
  readonly description: string;

  @IsNotEmpty({
    message: 'O campo "preço" não preenchido',
  })
  @IsString({
    message: 'O campo "preço" deve estar no formato de texto',
  })
  readonly price: string;

  @IsNotEmpty({
    message: 'O campo "quantidade" não preenchido',
  })
  @IsInt({
    message: 'O campo "quantidade" deve ser um número inteiro',
  })
  readonly quantity: number;

  @IsNotEmpty({
    message: 'O campo "sku" não preenchido',
  })
  @IsString({
    message: 'O campo "sku" deve estar em formato de texto',
  })
  readonly sku: string;

  @IsNotEmpty({
    message: 'O campo "funcionário" não preenchido',
  })
  @IsUUID(4, {
    message: 'O campo "funcionário deve ser um uuid"',
  })
  readonly employee: Employee;
}
