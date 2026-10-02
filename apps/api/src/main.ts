import { mkdirSync, accessSync, constants } from 'node:fs';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';
import { logLevelsFromEnv } from './config/log-level';
import { mediaDirFromEnv } from './config/media-dir';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: logLevelsFromEnv(),
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

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
  Logger.debug(
    `Database: ${process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ':***@')}`,
  );
}

bootstrap();
