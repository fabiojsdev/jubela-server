import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class ReqBodyCpfValidation implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    const cpf = String(value.cpf);

    if (metadata.type !== 'body') {
      throw new BadRequestException('metadata type must be "body"');
    }

    if (cpf) {
      if (cpf.length < 14 || cpf.length > 14) {
        throw new BadRequestException('Formato inválido do cpf');
      }

      if (cpf[3] !== '.' || cpf[7] !== '.' || cpf[11] !== '-') {
        throw new BadRequestException('Formato inválido do cpf');
      }
    }

    return value;
  }
}
