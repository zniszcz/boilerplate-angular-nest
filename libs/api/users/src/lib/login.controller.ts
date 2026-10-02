import {
  Body,
  Controller,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { I18nContext } from 'nestjs-i18n';
import {
  ACCESS_TOKEN_COOKIE,
  accessTokenCookieOptions,
  Public,
  TokenService,
  verifyPassword,
} from '@boilerplate/api-auth';
import { LoginDto } from './dto/login.dto';
import { UserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@Public()
@Controller('auth')
export class LoginController {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
  ) {}

  /** Checks email and password and sets the access token cookie. */
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserDto> {
    const user = await this.users.findForLogin(body.email);
    // The same error for an unknown email and a wrong password.
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new UnauthorizedException(
        I18nContext.current()?.t('auth.invalidCredentials'),
      );
    }
    const token = await this.tokens.issueAccessToken(
      this.users.toAuthUser(user),
    );
    response.cookie(ACCESS_TOKEN_COOKIE, token, accessTokenCookieOptions());
    return this.users.toDto(user);
  }

  /** Removes the access token cookie. */
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response): void {
    // clearCookie needs the same options as cookie, apart from maxAge.
    const options = { ...accessTokenCookieOptions(), maxAge: undefined };
    response.clearCookie(ACCESS_TOKEN_COOKIE, options);
  }
}
