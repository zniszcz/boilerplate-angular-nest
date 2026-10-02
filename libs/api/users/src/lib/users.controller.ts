import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
  type AuthUser,
  CurrentUser,
  RequirePermissions,
} from '@boilerplate/api-auth';
import { UserDto } from './dto/user.dto';
import { PERMISSIONS } from './permissions';
import { UsersService } from './users.service';

@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** The logged in user. */
  @Get('me')
  async me(@CurrentUser() current: AuthUser): Promise<UserDto> {
    const user = await this.users.findById(current.id);
    if (!user) {
      throw new NotFoundException();
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
