import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './api/users.controller';
import {
  AccountRemoval,
  Credentials,
  PasswordGenerator,
  PasswordHasher,
  UserQueries,
  UserRegistration,
} from './application';
import { UserRepository } from './domain';
import { CryptoPasswordGenerator } from './infrastructure/crypto-password-generator';
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
    UserRegistration,
    AccountRemoval,
    { provide: UserRepository, useClass: TypeormUserRepository },
    { provide: PasswordHasher, useClass: ScryptPasswordHasher },
    { provide: PasswordGenerator, useClass: CryptoPasswordGenerator },
  ],
  exports: [UserQueries, Credentials],
})
export class UsersModule {}

/** Tables of this domain, for the TypeORM data source. */
export const USERS_ENTITIES = [UserRecord, PermissionRecord];
