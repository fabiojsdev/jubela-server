import { IsJWT, IsNotEmpty } from 'class-validator';

export class RefreshTokenDTO {
  @IsNotEmpty()
  @IsJWT()
  refreshToken: string;
}
