import { mkdirSync, accessSync, constants } from 'node:fs';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';
import { logLevelsFromEnv } from './config/log-level';
import { mediaDirFromEnv } from './config/media-dir';
import { validationException } from '@boilerplate/api-responses';
import { EnvelopeExceptionFilter } from './responses/envelope-exception.filter';
import { EnvelopeInterceptor } from './responses/envelope.interceptor';
import { createOpenApiDocument } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: logLevelsFromEnv(),
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
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

  // Local and test environments only, never on production.
  const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true';
  if (swaggerEnabled) {
    SwaggerModule.setup(`${globalPrefix}/docs`, app, () =>
      createOpenApiDocument(app),
    );
  }

  // Fail at startup, not on the first upload, when the volume is not writable.
  const mediaDir = mediaDirFromEnv();
  mkdirSync(mediaDir, { recursive: true });
  accessSync(mediaDir, constants.W_OK);
  app.useStaticAssets(mediaDir, { prefix: `/${globalPrefix}/media` });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.debug(`Log levels: ${logLevelsFromEnv().join(', ')}`);
  Logger.debug(`Media directory: ${mediaDir}`);
  Logger.debug(`Swagger: ${swaggerEnabled ? `/${globalPrefix}/docs` : 'off'}`);
  Logger.debug(
    `Database: ${process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ':***@')}`,
  );
}

bootstrap();
