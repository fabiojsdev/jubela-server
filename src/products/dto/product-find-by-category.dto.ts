import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ProductFindByCategoryDTO {
  @IsNotEmpty({
    message: 'Campo "categoria" não preenchido',
  })
  @IsString({
    message: 'O campo "categoria" deve estar no formato de texto',
  })
  @Length(0, 60, {
    message: 'O campo "categoria" deve ter o comprimento máximo de 60',
  })
  readonly category: string;
}
