import {
  applyDecorators,
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiError } from './api-error';
import type { AuthUser } from './auth-user';

export const IS_PUBLIC = 'auth:isPublic';
export const REQUIRED_PERMISSIONS = 'auth:requiredPermissions';
export const PUBLIC_EXTENSION = 'x-public';

/**
 * Opens a route or a controller to requests without a token. The extension
 * tells createOpenApiDocument not to document a 401 here.
 */
export const Public = () =>
  applyDecorators(
    SetMetadata(IS_PUBLIC, true),
    ApiExtension(PUBLIC_EXTENSION, true),
  );

/** Allows the route only to users who have every listed permission. */
export const RequirePermissions = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(REQUIRED_PERMISSIONS, permissions),
    ApiError(403, `The user lacks a permission: ${permissions.join(', ')}`, {
      message: 'Forbidden',
      statusCode: 403,
    }),
  );

/** Injects the logged in user. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<Request & { user: AuthUser }>().user,
);
