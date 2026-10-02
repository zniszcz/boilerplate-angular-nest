import type { CookieOptions } from 'express';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from './token.service';

/** Tokens travel only in these cookies, never in a response body. */
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * httpOnly: page scripts cannot read them, so XSS cannot steal them.
 * SameSite=Strict: other sites cannot send them, which blocks CSRF. Works
 * because the web app and the API share one domain.
 * Secure outside development, where there is no HTTPS.
 */
function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  };
}

/** Sent with every API request. */
export function accessTokenCookieOptions(): CookieOptions {
  return {
    ...baseOptions(),
    path: '/api',
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  };
}

/** Sent only to /api/auth, where refresh and logout live. */
export function refreshTokenCookieOptions(): CookieOptions {
  return {
    ...baseOptions(),
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  };
}
