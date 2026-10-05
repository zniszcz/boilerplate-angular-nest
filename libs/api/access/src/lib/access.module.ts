import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { ACCESS_TOKEN_TTL_SECONDS, TokenService } from './token.service';

/** JWT access tokens and the global guard. Needs JWT_SECRET. */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET is not set');
        }
        return {
          secret,
          signOptions: { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
        };
      },
    }),
  ],
  providers: [TokenService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [TokenService],
})
export class AccessModule {}
