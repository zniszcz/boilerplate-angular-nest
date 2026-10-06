import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  accessTokenCookieOptions,
  clearAuthCookies,
  Public,
  REFRESH_TOKEN_COOKIE,
  refreshTokenCookieOptions,
  TokenService,
} from '@boilerplate/api-access';
import { ApiError, AppException } from '@boilerplate/api-responses';
import { type Account, AuthenticationService } from '../application';
import type { AccountDto } from './account.dto';
import { LoginDto } from './login.dto';
import { LoginThrottlerGuard, REFRESH_THROTTLE } from './login-throttler.guard';

@Public()
@Controller('auth')
export class LoginController {
  constructor(
    private readonly authentication: AuthenticationService,
    private readonly tokens: TokenService,
  ) {}

  /** Checks email and password and sets both token cookies. */
  @Post('login')
  @HttpCode(200)
  @UseGuards(LoginThrottlerGuard)
  @ApiError(400, 'VALIDATION_ERROR', 'The body does not match LoginDto')
  @ApiError(401, 'AUTH_INVALID_CREDENTIALS', 'Unknown email or wrong password')
  @ApiError(
    429,
    'AUTH_TOO_MANY_ATTEMPTS',
    'More than 5 attempts a minute from one address. Blocks for 15 minutes; `retryAfter` and the Retry-After header give the seconds left',
    { retryAfter: 900 },
  )
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccountDto> {
    const result = await this.authentication.login(body.email, body.password);
    if (result.status === 'refused') {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'AUTH_INVALID_CREDENTIALS',
      );
    }
    await this.setCookies(response, result.account, result.refreshToken);
    return toDto(result.account);
  }

  /**
   * Exchanges the refresh token cookie for new tokens. Permissions are read
   * from the database again, so a change applies from here on.
   */
  @Post('refresh')
  @HttpCode(200)
  @UseGuards(LoginThrottlerGuard)
  @Throttle({ default: REFRESH_THROTTLE })
  @ApiError(
    401,
    'AUTH_REFRESH_REJECTED',
    'Missing, expired or reused refresh token. Both cookies are cleared',
  )
  @ApiError(
    429,
    'AUTH_TOO_MANY_ATTEMPTS',
    'More than 20 attempts a minute from one address. Blocks for 1 minute',
    { retryAfter: 60 },
  )
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccountDto> {
    const presented = refreshCookie(request);
    const result = presented
      ? await this.authentication.refresh(presented)
      : ({ status: 'refused' } as const);
    if (result.status === 'refused') {
      clearAuthCookies(response);
      throw new AppException(HttpStatus.UNAUTHORIZED, 'AUTH_REFRESH_REJECTED');
    }
    await this.setCookies(response, result.account, result.refreshToken);
    return toDto(result.account);
  }

  /** Ends the session and removes both cookies. */
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const presented = refreshCookie(request);
    if (presented) {
      await this.authentication.logout(presented);
    }
    clearAuthCookies(response);
  }

  private async setCookies(
    response: Response,
    account: Account,
    refreshToken: string,
  ): Promise<void> {
    const accessToken = await this.tokens.issueAccessToken(account);
    response.cookie(
      ACCESS_TOKEN_COOKIE,
      accessToken,
      accessTokenCookieOptions(),
    );
    response.cookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      refreshTokenCookieOptions(),
    );
  }
}

/** Copies only the fields the API may show. */
function toDto(account: Account): AccountDto {
  return {
    id: account.id,
    email: account.email,
    permissions: account.permissions,
  };
}

function refreshCookie(request: Request): string | undefined {
  return (request.cookies as Record<string, string> | undefined)?.[
    REFRESH_TOKEN_COOKIE
  ];
}
