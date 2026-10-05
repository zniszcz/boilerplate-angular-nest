import { ApiResponse } from '@nestjs/swagger';

/**
 * Documents one error in Swagger: when it happens and the exact body the
 * API sends back. Every error a route can return gets its own entry.
 */
export const ApiError = (
  status: number,
  description: string,
  example: Record<string, unknown>,
) =>
  ApiResponse({
    status,
    description,
    content: { 'application/json': { example } },
  });

/** Added by createOpenApiDocument to every route without @Public(). */
export const UNAUTHORIZED_EXAMPLE = {
  message: 'Unauthorized',
  statusCode: 401,
};
