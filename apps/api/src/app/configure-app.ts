import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { validationException } from '@boilerplate/api-responses';
import { EnvelopeExceptionFilter } from '../responses/envelope-exception.filter';
import { EnvelopeInterceptor } from '../responses/envelope.interceptor';

export const GLOBAL_PREFIX = 'api';

/**
 * Everything the API does to each request apart from the routes. Shared by
 * main.ts and the API tests, so the tests see the same responses as clients.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(GLOBAL_PREFIX);
  // Standard security headers. Its default Content Security Policy also
  // lets the Swagger UI work.
  app.use(helmet());
  app.use(cookieParser());
  // Rejects bodies with fields the DTO does not declare. Invalid fields
  // become VALIDATION_ERROR details.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validationException,
    }),
  );
  // Every response the web app sees has an envelope. See
  // docs/adr/0012-response-envelope.md.
  app.useGlobalInterceptors(new EnvelopeInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new EnvelopeExceptionFilter());
}
