import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';
import {
  type AuthUser,
  CurrentUser,
  RequirePermissions,
} from '@boilerplate/api-auth';
import { AppException } from '@boilerplate/api-responses';
import { UserDto } from './dto/user.dto';
import { PERMISSIONS } from './permissions';
import { UsersService } from './users.service';

@ApiCookieAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** The logged in user. */
  @Get('me')
  async me(@CurrentUser() current: AuthUser): Promise<UserDto> {
    const user = await this.users.findById(current.id);
    // The account was deleted after the token was issued: the session is
    // no longer valid, and the next refresh fails too.
    if (!user) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'AUTH_UNAUTHENTICATED');
    }
    return this.users.toDto(user);
  }

  /** All users. Example of a route that needs a permission. */
  @Get()
  @RequirePermissions(PERMISSIONS.usersRead)
  async list(): Promise<UserDto[]> {
    return (await this.users.findAll()).map((u) => this.users.toDto(u));
  }
}
