import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  type AuthUser,
  clearAuthCookies,
  CurrentUser,
  RequirePermissions,
} from '@boilerplate/api-access';
import { ApiError, AppException } from '@boilerplate/api-responses';
import {
  AccountRemoval,
  UserQueries,
  UserRegistration,
  type UserView,
} from '../application';
import { PERMISSIONS } from '../domain';
import { CreateUserDto } from './create-user.dto';
import type { CreatedUserDto } from './created-user.dto';
import { DeleteAccountDto } from './delete-account.dto';
import type { UserDto } from './user.dto';

@ApiCookieAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UserQueries,
    private readonly registration: UserRegistration,
    private readonly removal: AccountRemoval,
  ) {}

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

  /**
   * Adds an account without permissions. Its generated password is in this
   * response only; pass it to the user.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.usersCreate)
  @ApiError(400, 'VALIDATION_ERROR', 'The body does not match CreateUserDto')
  @ApiError(409, 'USERS_EMAIL_TAKEN', 'An account with this email exists')
  async create(@Body() body: CreateUserDto): Promise<CreatedUserDto> {
    const result = await this.registration.register(body.email);
    if (result.status === 'email-taken') {
      throw new AppException(HttpStatus.CONFLICT, 'USERS_EMAIL_TAKEN');
    }
    return { user: toDto(result.user), password: result.password };
  }

  /**
   * Deletes the logged in user's own account and removes both cookies.
   * There is no route to delete another account.
   */
  @Delete('me')
  @HttpCode(200)
  @ApiError(400, 'VALIDATION_ERROR', 'The body does not match DeleteAccountDto')
  @ApiError(403, 'USERS_WRONG_PASSWORD', 'The password is not the current one')
  @ApiError(
    409,
    'USERS_LAST_ADMIN',
    'The account is the last one that can add users',
  )
  async deleteOwn(
    @CurrentUser() current: AuthUser,
    @Body() body: DeleteAccountDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const result = await this.removal.removeOwn(current.id, body.password);
    if (result === 'wrong-password') {
      throw new AppException(HttpStatus.FORBIDDEN, 'USERS_WRONG_PASSWORD');
    }
    if (result === 'last-admin') {
      throw new AppException(HttpStatus.CONFLICT, 'USERS_LAST_ADMIN');
    }
    clearAuthCookies(response);
  }
}

/** Copies only the fields the API may show. */
function toDto(user: UserView): UserDto {
  return {
    id: user.id,
    email: user.email,
    permissions: user.permissions,
    firstLoginAt: user.firstLoginAt?.toISOString() ?? null,
  };
}
