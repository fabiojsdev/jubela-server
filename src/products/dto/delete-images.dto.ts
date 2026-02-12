import { IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteImagesDTO {
  @IsNotEmpty({
    message: 'Id do produto não fornecido',
  })
  @IsUUID(4, {
    message: 'O id do produto deve ser um uuid',
  })
  productId: string;

  @IsNotEmpty({
    message: 'Id da imagem não fornecido',
  })
  @IsUUID(4, {
    message: 'O id da imagem deve ser um uuid',
  })
  imageId: string;
}
