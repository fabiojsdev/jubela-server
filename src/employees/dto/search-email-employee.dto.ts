import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class SearchByEmailDTO {
  @IsNotEmpty({
    message: 'campo "email" não preenchido',
  })
  @IsString({
    message: 'campo "email" deve estar em formato de texto',
  })
  @Length(13, 50, {
    message: 'O campo "email" deve ter no mínimo 13 e no máximo 50 caracteres',
  })
  @IsEmail()
  readonly email: string;
}
