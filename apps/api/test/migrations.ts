import type { MigrationInterface } from 'typeorm';

type MigrationClass = new () => MigrationInterface;

// Stands in for src/database/migrations/index.ts in the tests: the same
// files, found by Vite instead of webpack's require.context.
const files = import.meta.glob<Record<string, MigrationClass>>(
  '../src/database/migrations/[0-9]*-*.ts',
  { eager: true },
);

export const MIGRATIONS: MigrationClass[] = Object.values(files).flatMap(
  (exports) => Object.values(exports),
);
