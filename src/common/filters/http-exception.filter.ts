import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainException } from '../errors/domain.exception.js';

type ErrorBody = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const body = this.toErrorBody(exception);
    response.status(body.httpStatus).json({
      code: body.code,
      message: body.message,
      details: body.details,
    });
  }

  private toErrorBody(exception: unknown): ErrorBody & { httpStatus: number } {
    if (exception instanceof DomainException) {
      return {
        httpStatus: exception.httpStatus,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        status === HttpStatus.BAD_REQUEST &&
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const message = exceptionResponse.message;
        return {
          httpStatus: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'La solicitud contiene datos inválidos.',
          details: {
            errors: message,
          },
        };
      }

      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : typeof exceptionResponse === 'object' &&
              exceptionResponse !== null &&
              'message' in exceptionResponse
            ? String(exceptionResponse.message)
            : exception.message;

      return {
        httpStatus: status,
        code: 'HTTP_ERROR',
        message,
      };
    }

    return {
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Ocurrió un error interno.',
    };
  }
}
