import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginUserDTO {
  @IsNotEmpty({
    message: 'campo "nome" não preenchido',
  })
  @IsString()
  @Length(0, 125, {
    message: 'campo "nome" deve ter no máximo 125 caracteres',
  })
  readonly name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
