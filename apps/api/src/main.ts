import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { logLevelsFromEnv } from './config/log-level';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: logLevelsFromEnv(),
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.debug(`Log levels: ${logLevelsFromEnv().join(', ')}`);
  Logger.debug(
    `Database: ${process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ':***@')}`,
  );
}

bootstrap();
