import { IsEmail, IsJWT, IsNotEmpty } from 'class-validator';

export class LogoutDTO {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsJWT()
  token: string;

  @IsNotEmpty()
  @IsJWT()
  refreshToken: string;
}
