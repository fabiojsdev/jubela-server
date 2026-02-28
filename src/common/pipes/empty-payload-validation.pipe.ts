import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class IsNotEmptyPayloadPipe implements PipeTransform {
  transform(payload: any) {
    if (!payload || Object.keys(payload).length === 0) {
      throw new BadRequestException(
        'O corpo da requisição não pode estar vazio.',
      );
    }
    return payload;
  }
}
