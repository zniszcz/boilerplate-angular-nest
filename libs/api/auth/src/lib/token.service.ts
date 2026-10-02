import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenClaims, AuthUser } from './auth-user';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  issueAccessToken(user: AuthUser): Promise<string> {
    const claims: AccessTokenClaims = {
      sub: user.id,
      email: user.email,
      permissions: user.permissions,
    };
    return this.jwt.signAsync(claims);
  }
}
