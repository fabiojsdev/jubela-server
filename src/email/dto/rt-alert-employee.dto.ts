import { IsEmail, IsString, IsUUID } from 'class-validator';

export class RTAlertEmployeeDTO {
  @IsEmail()
  email: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  tokenId: string;

  @IsString()
  occurredAt: string;
}
