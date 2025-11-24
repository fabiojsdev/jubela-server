import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateUuidDTO {
  @IsNotEmpty({
    message: 'Id do funcionário não fornecido',
  })
  @IsUUID(4, {
    message: 'O id do funcionário deve ser um uuid',
  })
  id: string;
}
