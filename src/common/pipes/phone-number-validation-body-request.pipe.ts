import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class ReqBodyPhoneNumberValidation implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    const phoneNumber = String(value.phone_number);

    if (metadata.type !== 'body') {
      throw new BadRequestException('metadata type must be "body"');
    }

    if (phoneNumber) {
      if (phoneNumber.length < 15 || phoneNumber.length > 15) {
        throw new BadRequestException('Formato inválido de telefone');
      }

      if (
        !phoneNumber.includes('(') ||
        !phoneNumber.includes(')') ||
        !phoneNumber.includes('-') ||
        !phoneNumber.includes(' ')
      ) {
        throw new BadRequestException('Formato inválido de telefone');
      }
    }

    return value;
  }
}
