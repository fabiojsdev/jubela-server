import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PartialRefundItemDTO } from './refund-item.dto';

export class PartialRefundDTO {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PartialRefundItemDTO)
  items: PartialRefundItemDTO[]; // ✅ Lista de itens sendo devolvidos

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
