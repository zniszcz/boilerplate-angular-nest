import type { CookieOptions } from 'express';
import { ACCESS_TOKEN_TTL_SECONDS } from './token.service';

/** The access token travels only in this cookie, never in a response body. */
export const ACCESS_TOKEN_COOKIE = 'access_token';

/**
 * httpOnly: page scripts cannot read it, so XSS cannot steal it.
 * SameSite=Strict: other sites cannot send it, which blocks CSRF. Works
 * because the web app and the API share one domain.
 * Secure outside development, where there is no HTTPS.
 */
export function accessTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api',
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  };
}
