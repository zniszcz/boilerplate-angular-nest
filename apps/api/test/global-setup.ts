import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import type { TestProject } from 'vitest/node';
import { dataSourceOptions } from '../src/database/data-source';
import { TEMPLATE_DATABASE } from './template';

declare module 'vitest' {
  export interface ProvidedContext {
    postgresAdminUrl: string;
  }
}

let container: StartedPostgreSqlContainer;

/**
 * One container for the whole run. Migrations run once, into a template;
 * each test file then gets its own copy, so files run in parallel and never
 * see each other's data. The same image as in docker-compose.yml.
 */
export async function setup(project: TestProject): Promise<void> {
  container = await new PostgreSqlContainer('postgres:18.6')
    .withDatabase(TEMPLATE_DATABASE)
    // Throwaway data: kept in memory and never flushed to disk, which saves
    // the laptop's CPU and disk. Never do this outside tests.
    .withTmpFs({ '/var/lib/postgresql': 'rw' })
    .withCommand([
      'postgres',
      '-c',
      'fsync=off',
      '-c',
      'synchronous_commit=off',
      '-c',
      'full_page_writes=off',
    ])
    .start();
  const dataSource = new DataSource({
    ...dataSourceOptions,
    url: container.getConnectionUri(),
  });
  await dataSource.initialize();
  await dataSource.runMigrations({ transaction: 'each' });
  await dataSource.destroy();

  const admin = new URL(container.getConnectionUri());
  admin.pathname = '/postgres';
  project.provide('postgresAdminUrl', admin.toString());
}

export async function teardown(): Promise<void> {
  await container?.stop();
}
