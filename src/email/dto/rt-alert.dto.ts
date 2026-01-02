import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class RTAlertDTO {
  @IsEmail()
  email: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  tokenId: string;

  @IsString()
  occurredAt: string;

  @IsString()
  @IsOptional()
  loginUrl?: string;
}
