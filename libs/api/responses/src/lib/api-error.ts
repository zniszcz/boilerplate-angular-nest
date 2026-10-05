import { ApiResponse } from '@nestjs/swagger';
import type { ResponseCode } from '@boilerplate/contracts';
import { errorEnvelope } from './app-exception';

/** Name of the error envelope schema that createOpenApiDocument registers. */
export const ERROR_ENVELOPE_SCHEMA = 'ErrorEnvelope';

/**
 * One documented error: the HTTP status, the code, when it happens and an
 * example body. Every error a route can return gets its own entry.
 */
export function errorResponse(
  code: ResponseCode,
  description: string,
  params?: Record<string, unknown>,
) {
  return {
    description: `\`${code}\`: ${description}`,
    content: {
      'application/json': {
        schema: { $ref: `#/components/schemas/${ERROR_ENVELOPE_SCHEMA}` },
        example: errorEnvelope(code, params && { params }),
      },
    },
  };
}

export const ApiError = (
  status: number,
  code: ResponseCode,
  description: string,
  params?: Record<string, unknown>,
) => ApiResponse({ status, ...errorResponse(code, description, params) });
