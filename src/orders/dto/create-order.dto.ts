import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { User } from 'src/users/entities/user.entity';

export class CreateOrderDTO {
  @IsNotEmpty({
    message: 'Campo "item" não preenchido',
  })
  @IsString({
    message: 'O campo "item" deve estar no formato de texto',
  })
  readonly item: string;

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
  @IsString({
    message: 'O campo "preço" deve estar no formato de texto',
  })
  @IsNumberString({
    no_symbols: true,
  })
  readonly price: string;

  @IsNotEmpty({
    message: 'Campo "descrição" não preenchido',
  })
  @IsString({
    message: 'O campo "descrição" deve estar no formato de texto',
  })
  readonly description: string;

  @IsNotEmpty({
    message: 'Campo "usuário" não preenchido',
  })
  @IsUUID(4, {
    message: 'O campo "usuário deve ser um uuid"',
  })
  readonly user: User;

  @IsNotEmpty({
    message: 'Campo "status" não preenchido',
  })
  @IsEnum(OrderStatus, {
    message: 'Status do pedido inválido',
  })
  readonly status: OrderStatus;
}
