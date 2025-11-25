import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumberString, Max, Min } from 'class-validator';

export class PaginationByPriceDTO {
  @IsInt({
    message: 'Limite precisa ser um numero inteiro',
  })
  @Min(0, {
    message: 'Limite não pode ser menor que 0',
  })
  @Max(20, {
    message: 'Limite não pode ser maior que 20',
  })
  @Type(() => Number)
  limit: number;

  @IsInt({
    message: 'Offset precisa ser um numero inteiro',
  })
  @Min(0, {
    message: 'Offset não deve ser menor que 0',
  })
  @Type(() => Number)
  offset: number;

  @IsNotEmpty({
    message: 'Id do usuário não fornecido',
  })
  @IsNumberString({
    no_symbols: true,
  })
  value: string;
}
