import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginController } from './login.controller';
import { Permission } from './permission.entity';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Permission])],
  controllers: [LoginController, UsersController],
  providers: [UsersService],
})
export class UsersModule {}

/** Entities for the TypeORM data source. */
export const USERS_ENTITIES = [User, Permission];
