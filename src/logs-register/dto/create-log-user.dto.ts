import { IsEmail, IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';
import { User } from 'src/users/entities/user.entity';

export class CreateLogUser {
  @IsNotEmpty({
    message: 'campo "email" não preenchido',
  })
  @IsString({
    message: 'campo "email" deve estar em formato de texto',
  })
  @IsEmail()
  @Length(13, 50, {
    message: 'O campo "email" deve ter no mínimo 13 e no máximo 50 caracteres',
  })
  readonly email: string;

  @IsNotEmpty({
    message: 'campo "nome" não preenchido',
  })
  @IsString({
    message: 'campo "nome" deve estar em formato de texto',
  })
  @Length(0, 125, {
    message: 'campo "nome" deve ter no máximo 125 caracteres',
  })
  readonly name: string;

  @IsNotEmpty({
    message: 'Campo "funcionário" não preenchido',
  })
  @IsUUID(4, {
    message: 'O campo "funcionário deve ser um uuid"',
  })
  readonly user: User;
}
