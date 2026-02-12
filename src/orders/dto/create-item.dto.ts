import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { IsDecimalString } from 'src/common/decoratos/decimal-string.decorator';
import { Product } from 'src/products/entities/product.entity';

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
    message: 'Campo "preço" não preenchido',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim(); // Remove espaços em branco
    }
    return value;
  })
  @IsDecimalString({
    message: 'O campo preco deve ser um string decima ex: 59.99',
  })
  readonly price: string;

  @IsNotEmpty({
    message: 'Campo "produto" não preenchido',
  })
  @IsUUID(4, {
    message: 'O campo "produto deve ser um uuid"',
  })
  readonly product: Product;
}
