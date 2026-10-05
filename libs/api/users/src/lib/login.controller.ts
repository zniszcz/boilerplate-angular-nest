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
  Public,
  REFRESH_TOKEN_COOKIE,
  refreshTokenCookieOptions,
  TokenService,
  verifyPassword,
} from '@boilerplate/api-auth';
import { ApiError, AppException } from '@boilerplate/api-responses';
import { LoginDto } from './dto/login.dto';
import { LoginThrottlerGuard, REFRESH_THROTTLE } from './login-throttler.guard';
import { UserDto } from './dto/user.dto';
import { SessionsService } from './sessions.service';
import type { User } from './user.entity';
import { UsersService } from './users.service';

@Public()
@Controller('auth')
export class LoginController {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
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
  ): Promise<UserDto> {
    const user = await this.users.findForLogin(body.email);
    // The same error for an unknown email and a wrong password.
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'AUTH_INVALID_CREDENTIALS',
      );
    }
    await this.setCookies(response, user, await this.sessions.start(user.id));
    return this.users.toDto(user);
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
  ): Promise<UserDto> {
    const presented = refreshCookie(request);
    const result = presented
      ? await this.sessions.rotate(presented)
      : ({ status: 'rejected' } as const);
    const user =
      result.status === 'rotated'
        ? await this.users.findById(result.userId)
        : null;
    if (result.status !== 'rotated' || !user) {
      clearCookies(response);
      throw new AppException(HttpStatus.UNAUTHORIZED, 'AUTH_REFRESH_REJECTED');
    }
    await this.setCookies(response, user, result.token);
    return this.users.toDto(user);
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
      await this.sessions.end(presented);
    }
    clearCookies(response);
  }

  private async setCookies(
    response: Response,
    user: User,
    refreshToken: string,
  ): Promise<void> {
    const accessToken = await this.tokens.issueAccessToken(
      this.users.toAuthUser(user),
    );
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

function refreshCookie(request: Request): string | undefined {
  return (request.cookies as Record<string, string> | undefined)?.[
    REFRESH_TOKEN_COOKIE
  ];
}

// clearCookie needs the same options as cookie, apart from maxAge.
function clearCookies(response: Response): void {
  response.clearCookie(ACCESS_TOKEN_COOKIE, {
    ...accessTokenCookieOptions(),
    maxAge: undefined,
  });
  response.clearCookie(REFRESH_TOKEN_COOKIE, {
    ...refreshTokenCookieOptions(),
    maxAge: undefined,
  });
}
