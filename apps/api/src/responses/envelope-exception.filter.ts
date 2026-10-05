import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ErrorEnvelope } from '@boilerplate/contracts';
import { AppException, errorEnvelope } from '@boilerplate/api-responses';

/**
 * Turns every exception into the error envelope. Routes throw AppException;
 * anything else is mapped here, and what nobody designed becomes
 * UNEXPECTED_ERROR, the one place that code is set.
 */
@Catch()
export class EnvelopeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(EnvelopeExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const [status, body] = this.toEnvelope(exception);
    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }

  private toEnvelope(exception: unknown): [number, ErrorEnvelope] {
    if (exception instanceof AppException) {
      return [exception.getStatus(), exception.getResponse() as ErrorEnvelope];
    }
    // Thrown by the router for an unknown path, never by our routes.
    if (exception instanceof NotFoundException) {
      return [HttpStatus.NOT_FOUND, errorEnvelope('ROUTE_NOT_FOUND')];
    }
    // Thrown by the framework for a body that is not valid JSON or a broken
    // path. Our routes throw AppException, never this.
    if (exception instanceof BadRequestException) {
      return [HttpStatus.BAD_REQUEST, errorEnvelope('VALIDATION_ERROR')];
    }
    if (exception instanceof HttpException) {
      this.logger.warn(
        `HttpException without a code, use AppException: ${exception.message}`,
      );
    } else {
      this.logger.error(exception);
    }
    return [
      HttpStatus.INTERNAL_SERVER_ERROR,
      errorEnvelope('UNEXPECTED_ERROR'),
    ];
  }
}
