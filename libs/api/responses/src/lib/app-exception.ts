import { HttpException } from '@nestjs/common';
import type {
  ErrorEnvelope,
  FieldError,
  ResponseCode,
} from '@boilerplate/contracts';

/**
 * The only exception routes should throw. The body is the error envelope, so
 * the client gets a code from the catalog and the HTTP status together.
 */
export class AppException extends HttpException {
  constructor(
    status: number,
    readonly code: ResponseCode,
    options: {
      params?: Record<string, unknown>;
      details?: FieldError[];
    } = {},
  ) {
    super(errorEnvelope(code, options), status);
  }
}

export function errorEnvelope(
  code: ResponseCode,
  options: { params?: Record<string, unknown>; details?: FieldError[] } = {},
): ErrorEnvelope {
  return { status: 'error', code, ...options };
}
