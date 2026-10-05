import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';
import type { SuccessEnvelope } from '@boilerplate/contracts';
import { NO_ENVELOPE } from '@boilerplate/api-responses';

/**
 * Wraps whatever a route returns in the success envelope. Controllers return
 * plain data and never build an envelope themselves.
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const off = this.reflector.getAllAndOverride<boolean>(NO_ENVELOPE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (off) {
      return next.handle();
    }
    return next.handle().pipe(
      map((data): SuccessEnvelope<unknown> => ({
        status: 'success',
        code: 'OK',
        data: data ?? null,
      })),
    );
  }
}
