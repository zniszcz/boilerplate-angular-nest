import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './api/users.controller';
import { Credentials, PasswordHasher, UserQueries } from './application';
import { UserRepository } from './domain';
import { PermissionRecord } from './infrastructure/permission.record';
import { ScryptPasswordHasher } from './infrastructure/scrypt-password-hasher';
import { TypeormUserRepository } from './infrastructure/typeorm-user.repository';
import { UserRecord } from './infrastructure/user.record';

/** The only file that sees every layer: it binds ports to adapters. */
@Module({
  imports: [TypeOrmModule.forFeature([UserRecord, PermissionRecord])],
  controllers: [UsersController],
  providers: [
    UserQueries,
    Credentials,
    { provide: UserRepository, useClass: TypeormUserRepository },
    { provide: PasswordHasher, useClass: ScryptPasswordHasher },
  ],
  exports: [UserQueries, Credentials],
})
export class UsersModule {}

/** Tables of this domain, for the TypeORM data source. */
export const USERS_ENTITIES = [UserRecord, PermissionRecord];
