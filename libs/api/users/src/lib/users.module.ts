import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LOGIN_THROTTLE } from './login-throttler.guard';
import { LoginController } from './login.controller';
import { Permission } from './permission.entity';
import { RefreshToken } from './refresh-token.entity';
import { SessionsService } from './sessions.service';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Permission, RefreshToken]),
    // Used only by the routes with LoginThrottlerGuard, not the whole API.
    ThrottlerModule.forRoot([LOGIN_THROTTLE]),
  ],
  controllers: [LoginController, UsersController],
  providers: [UsersService, SessionsService],
  exports: [SessionsService],
})
export class UsersModule {}

/** Entities for the TypeORM data source. */
export const USERS_ENTITIES = [User, Permission, RefreshToken];
