import {
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { Employee } from 'src/employees/entities/employee.entity';

export class CreateProductDTO {
  @IsNotEmpty({
    message: 'Campo "nome" não preenchido',
  })
  @IsString({
    message: 'O campo "nome" deve estar no formato de texto',
  })
  readonly name: string;

  @IsNotEmpty({
    message: 'Campo "categoria" não preenchido',
  })
  @IsString({
    message: 'O campo "categoria" deve estar no formato de texto',
  })
  readonly category: string;

  @IsNotEmpty({
    message: 'Campo "descrição" não preenchido',
  })
  @IsString({
    message: 'O campo "descrição" deve estar no formato de texto',
  })
  readonly description: string;

  @IsNotEmpty({
    message: 'Campo "preço" não preenchido',
  })
  @IsString({
    message: 'O campo "preço" deve estar no formato de texto',
  })
  @IsNumberString({
    no_symbols: true,
  })
  readonly price: string;

  @IsNotEmpty({
    message: 'Campo "quantidade" não preenchido',
  })
  @IsInt({
    message: 'Campo "quantidade" deve ser um número inteiro positivo',
  })
  @IsPositive({
    message: 'Campo "quantidade" deve ser um número inteiro positivo',
  })
  readonly quantity: number;

  @IsNotEmpty({
    message: 'Campo "sku" não preenchido',
  })
  @IsString({
    message: 'O campo "sku" deve estar em formato de texto',
  })
  readonly sku: string;

  @IsNotEmpty({
    message: 'Campo "funcionário" não preenchido',
  })
  @IsUUID(4, {
    message: 'O campo "funcionário deve ser um uuid"',
  })
  readonly employee: Employee;
}
