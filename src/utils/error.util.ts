import {
  HttpException,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { GeneralErrorType } from 'src/common/enums/general-error-type.enum';
import { ErrorMessages } from 'src/interfaces/error-messages';
import { QueryFailedError } from 'typeorm';
import { GetErrorMessage } from './error-message.util';

export function ErrorManagement(
  error: unknown,
  generalErrorType: GeneralErrorType,
  messages: ErrorMessages,
) {
  const logger = new Logger('errorManagement');
  const manageError = GetErrorMessage(error);

  logger.error(
    `${messages.logger}: ${manageError}`,
    error instanceof Error ? error.stack : null,
  );

  if (error instanceof QueryFailedError) {
    throw new InternalServerErrorException(messages.queryFailedError);
  }

  if (error instanceof HttpException) {
    const status = error.getStatus();

    if (status >= 500) {
      throw new InternalServerErrorException(messages.internalServerError);
    }

    throw error;
  }

  switch (generalErrorType) {
    case GeneralErrorType.INTERNAL:
      throw new InternalServerErrorException(messages.generalError);

    case GeneralErrorType.UNAUTHORIZED:
      throw new UnauthorizedException(messages.generalError);
  }
}
