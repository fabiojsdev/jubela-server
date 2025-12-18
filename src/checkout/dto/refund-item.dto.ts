import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class PartialRefundItemDTO {
  @IsUUID()
  orderItemId: string; // ID do OrderItem que está sendo devolvido

  @IsNumber()
  @Min(1)
  quantity: number; // Quantidade que está sendo devolvida

  @IsUUID()
  productId: string;

  @IsString()
  product_name: string;
}
