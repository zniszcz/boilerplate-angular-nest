import * as pg from 'pg';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { AUTHENTICATION_ENTITIES } from '@boilerplate/api-authentication';
import { USERS_ENTITIES } from '@boilerplate/api-users';
import { MIGRATIONS } from './migrations';

/**
 * One configuration for the app, the migrate and seed commands and the
 * TypeORM CLI. The schema changes only through migrations, never by sync.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  // Passed explicitly, so Nx sees pg and puts it in the generated package.json.
  driver: pg,
  url: process.env.DATABASE_URL,
  // gen_random_uuid() is built into PostgreSQL, so no extension is needed and
  // the app user does not need the right to create one.
  uuidExtension: 'pgcrypto',
  installExtensions: false,
  entities: [...USERS_ENTITIES, ...AUTHENTICATION_ENTITIES],
  migrations: MIGRATIONS,
  synchronize: false,
  migrationsRun: false,
};

/** Read by the TypeORM CLI when generating migrations. */
export const dataSource = new DataSource(dataSourceOptions);
