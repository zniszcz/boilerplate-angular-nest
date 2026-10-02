import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AccessTokenClaims, AuthUser } from './auth-user';
import { ACCESS_TOKEN_COOKIE } from './cookie';
import { IS_PUBLIC, REQUIRED_PERMISSIONS } from './decorators';

/**
 * Registered globally: every route needs a valid access token unless it is
 * marked with @Public(). Then checks @RequirePermissions().
 * The token comes from the cookie, or from an `Authorization: Bearer` header
 * for clients that are not browsers.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const token = readToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    let claims: AccessTokenClaims;
    try {
      claims = await this.jwt.verifyAsync<AccessTokenClaims>(token);
    } catch {
      throw new UnauthorizedException();
    }
    const user: AuthUser = {
      id: claims.sub,
      email: claims.email,
      permissions: claims.permissions,
    };
    request.user = user;

    const required =
      this.reflector.getAllAndOverride<string[]>(
        REQUIRED_PERMISSIONS,
        targets,
      ) ?? [];
    if (!required.every((p) => user.permissions.includes(p))) {
      throw new ForbiddenException();
    }
    return true;
  }
}

function readToken(request: Request): string | undefined {
  const cookie = (request.cookies as Record<string, string> | undefined)?.[
    ACCESS_TOKEN_COOKIE
  ];
  if (cookie) {
    return cookie;
  }
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' ? token : undefined;
}
