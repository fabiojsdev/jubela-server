import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { RefundReason } from 'src/common/enums/refund-reason.enum';
import { Items } from 'src/orders/entities/items.entity';

export class RefundDTO {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number; // Se não informar, faz estorno total

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsEnum(RefundReason)
  reasonCode?: RefundReason;

  @IsOptional()
  items?: Items[];
}
