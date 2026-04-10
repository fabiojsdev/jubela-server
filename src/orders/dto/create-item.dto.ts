import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateOrderItemDTO {
  @IsNotEmpty({
    message: 'Campo "product_name" não preenchido',
  })
  @IsString({
    message: 'O campo "product_name" deve estar no formato de texto',
  })
  readonly product_name: string;

  @IsNotEmpty({
    message: 'Campo "quantidade" não preenchido',
  })
  @IsInt({
    message: 'Campo "item" deve ser um número inteiro positivo',
  })
  @IsPositive({
    message: 'Campo "item" deve ser um número inteiro positivo',
  })
  readonly quantity: number;

  @IsNotEmpty({
    message: 'Campo "produto" não preenchido',
  })
  @IsUUID(4, {
    message: 'O campo "produto deve ser um uuid"',
  })
  readonly product: string;
}
