import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '@boilerplate/api-users';
import { LoginController } from './api/login.controller';
import { LOGIN_THROTTLE } from './api/login-throttler.guard';
import {
  AuthenticationService,
  RefreshTokenCodec,
  SessionCleanup,
  UserLookup,
} from './application';
import { SessionRepository } from './domain';
import { CryptoRefreshTokenCodec } from './infrastructure/crypto-refresh-token-codec';
import { RefreshTokenRecord } from './infrastructure/refresh-token.record';
import { TypeormSessionRepository } from './infrastructure/typeorm-session.repository';
import { UsersUserLookup } from './infrastructure/users-user-lookup';

/**
 * Sessions alone, without routes or the users domain. Enough for the cleanup
 * command, which must run without JWT_SECRET.
 */
@Module({
  imports: [TypeOrmModule.forFeature([RefreshTokenRecord])],
  providers: [
    SessionCleanup,
    { provide: SessionRepository, useClass: TypeormSessionRepository },
  ],
  exports: [SessionCleanup, SessionRepository],
})
export class SessionsModule {}

/** The only file that sees every layer: it binds ports to adapters. */
@Module({
  imports: [
    SessionsModule,
    // Used only by the routes with LoginThrottlerGuard, not the whole API.
    ThrottlerModule.forRoot([LOGIN_THROTTLE]),
    UsersModule,
  ],
  controllers: [LoginController],
  providers: [
    AuthenticationService,
    { provide: RefreshTokenCodec, useClass: CryptoRefreshTokenCodec },
    { provide: UserLookup, useClass: UsersUserLookup },
  ],
})
export class AuthenticationModule {}

/** Tables of this domain, for the TypeORM data source. */
export const AUTHENTICATION_ENTITIES = [RefreshTokenRecord];
