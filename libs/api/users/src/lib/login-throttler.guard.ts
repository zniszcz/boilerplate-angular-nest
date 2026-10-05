import { type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import {
  normalizeIp,
  ThrottlerGuard,
  type ThrottlerLimitDetail,
} from '@nestjs/throttler';
import type { Request } from 'express';
import { AppException } from '@boilerplate/api-responses';

/** Limits per route. Counters live in memory, which fits one API instance. */
export const LOGIN_THROTTLE = {
  ttl: 60_000,
  limit: 5,
  // A long block after the limit, so guessing gives about 480 tries a day.
  blockDuration: 15 * 60_000,
};
export const REFRESH_THROTTLE = {
  ttl: 60_000,
  limit: 20,
  blockDuration: 60_000,
};

/**
 * Counts requests per client address. On the server every request comes
 * from Traefik, so the address is read from CF-Connecting-IP. The header
 * can be trusted there, because the firewall lets in only Cloudflare.
 * Without it, as locally, the connection address is used.
 */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Request): Promise<string> {
    const header = req.headers['cf-connecting-ip'];
    const ip = (Array.isArray(header) ? header[0] : header) ?? req.ip;
    return normalizeIp(ip ?? '', this.ipv6SubnetPrefix);
  }

  /** `retryAfter` is in seconds, the same as the Retry-After header. */
  protected override async throwThrottlingException(
    _context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new AppException(
      HttpStatus.TOO_MANY_REQUESTS,
      'AUTH_TOO_MANY_ATTEMPTS',
      { params: { retryAfter: detail.timeToBlockExpire } },
    );
  }
}
