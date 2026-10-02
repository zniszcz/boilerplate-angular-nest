import {
  Body,
  Controller,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  Public,
  TokenService,
  verifyPassword,
} from '@boilerplate/api-auth';
import { LoginDto } from './dto/login.dto';
import { TokenDto } from './dto/token.dto';
import { UsersService } from './users.service';

@Controller('auth')
export class LoginController {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
  ) {}

  /** Exchanges email and password for an access token. */
  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto): Promise<TokenDto> {
    const user = await this.users.findForLogin(body.email);
    // The same error for an unknown email and a wrong password.
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return {
      accessToken: await this.tokens.issueAccessToken(
        this.users.toAuthUser(user),
      ),
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }
}
