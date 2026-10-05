import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { REFRESH_TOKEN_TTL_SECONDS } from '@boilerplate/api-access';
import { RefreshTokenCodec } from '../application';
import type { RefreshToken } from '../domain';

@Injectable()
export class CryptoRefreshTokenCodec extends RefreshTokenCodec {
  newFamilyId(): string {
    return randomUUID();
  }

  issue(): { token: RefreshToken; presented: string } {
    const id = randomUUID();
    const secret = randomBytes(32).toString('base64url');
    return {
      token: {
        id,
        tokenHash: sha256(secret),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
        usedAt: null,
      },
      presented: `${id}.${secret}`,
    };
  }

  parse(presented: string): { id: string; secret: string } | null {
    const [id, secret] = presented.split('.');
    return id && secret && isUuid(id) ? { id, secret } : null;
  }

  matches(secret: string, tokenHash: string): boolean {
    return timingSafeEqual(Buffer.from(tokenHash), Buffer.from(sha256(secret)));
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
