// Removes refresh tokens nobody can use any more. Meant to run once a day
// from a scheduler: a Kubernetes CronJob in the cluster, but any cron works,
// because the schedule lives in the deployment, not in the app.
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SessionCleanup,
  SessionsModule,
} from '@boilerplate/api-authentication';
import { dataSourceOptions } from './data-source';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: () => dataSourceOptions }),
    SessionsModule,
  ],
})
class CleanupModule {}

async function cleanup() {
  const app = await NestFactory.createApplicationContext(CleanupModule, {
    logger: ['error', 'warn'],
  });
  const removed = await app.get(SessionCleanup).run(new Date());
  await app.close();
  console.log(`Removed ${removed} refresh tokens`);
}

cleanup().catch((error) => {
  console.error(error);
  process.exit(1);
});
