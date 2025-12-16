import { IsOptional, IsString } from 'class-validator';

export class CancelDTO {
  @IsOptional()
  @IsString({
    message: 'Campo "motivo" deve estar em formato de texto',
  })
  reason?: string;
}
