import { Transform } from 'class-transformer';
import { IsDecimalString } from 'src/common/decoratos/decimal-string.decorator';

export class UpdatePriceProductDTO {
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  })
  @IsDecimalString({
    message: 'O campo preco deve ser um string decima ex: 59.99',
  })
  readonly price: string;
}
