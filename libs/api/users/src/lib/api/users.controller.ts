import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';
import {
  type AuthUser,
  CurrentUser,
  RequirePermissions,
} from '@boilerplate/api-access';
import { AppException } from '@boilerplate/api-responses';
import { UserQueries, type UserView } from '../application';
import { PERMISSIONS } from '../domain';
import type { UserDto } from './user.dto';

@ApiCookieAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UserQueries) {}

  /** The logged in user. */
  @Get('me')
  async me(@CurrentUser() current: AuthUser): Promise<UserDto> {
    const user = await this.users.findById(current.id);
    // The account was deleted after the token was issued: the session is
    // no longer valid, and the next refresh fails too.
    if (!user) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'AUTH_UNAUTHENTICATED');
    }
    return toDto(user);
  }

  /** All users. Example of a route that needs a permission. */
  @Get()
  @RequirePermissions(PERMISSIONS.usersRead)
  async list(): Promise<UserDto[]> {
    return (await this.users.list()).map(toDto);
  }
}

/** Copies only the fields the API may show. */
function toDto(user: UserView): UserDto {
  return { id: user.id, email: user.email, permissions: user.permissions };
}
