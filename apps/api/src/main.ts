import { mkdirSync, accessSync, constants } from 'node:fs';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';
import { configureApp, GLOBAL_PREFIX } from './app/configure-app';
import { logLevelsFromEnv } from './config/log-level';
import { mediaDirFromEnv } from './config/media-dir';
import { createOpenApiDocument } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: logLevelsFromEnv(),
  });
  const globalPrefix = GLOBAL_PREFIX;
  configureApp(app);

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

  // PORT in Docker and the cluster; API_PORT from the root .env, because a
  // PORT there would also move the web dev server, which Nx starts with it.
  const port = process.env.PORT || process.env.API_PORT || 3000;
  // Only this machine locally (API_HOST in .env); every interface in a
  // container, where the cluster reaches it from outside.
  await app.listen(port, process.env.API_HOST || '0.0.0.0');
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
