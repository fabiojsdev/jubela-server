import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateOrderItemDTO } from 'src/orders/dto/create-item.dto';

export class OrderDTO {
  @IsArray({
    message: 'Pedidos deve ser um array',
  })
  @ValidateNested({ each: true }) // <--- ESSENCIAL: Valida cada item do array
  @Type(() => CreateOrderItemDTO)
  orderItems: CreateOrderItemDTO[];
}
