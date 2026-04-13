import {
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { GetErrorMessage } from './error-message.util';

export function ErrorManagement(error: unknown) {
  const logger = new Logger('errorManagement');
  const manageError = GetErrorMessage(error);

  logger.error(
    `Erro na devolução: ${manageError}`,
    error instanceof Error ? error.stack : null,
  );

  if (error instanceof QueryFailedError) {
    throw new InternalServerErrorException(
      'Erro na atualização dos dados da devolução',
    );
  }

  if (error instanceof HttpException) {
    const status = error.getStatus();

    if (status >= 500) {
      throw new InternalServerErrorException(
        'Erro interno ao processar devolução',
      );
    }

    throw error;
  }

  throw new InternalServerErrorException('Erro ao processar devolução');
}
