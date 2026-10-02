/// <reference types="webpack/module" />
import type { MigrationInterface } from 'typeorm';

type MigrationClass = new () => MigrationInterface;

// Webpack bundles every `<timestamp>-<Name>.ts` file in this folder at build
// time, so a new migration needs no registration. TypeORM runs them in the
// order of the timestamp at the end of the class name.
const files = require.context('.', false, /^\.\/\d+-.+\.ts$/);

export const MIGRATIONS: MigrationClass[] = files
  .keys()
  .flatMap((key) =>
    Object.values(files(key) as Record<string, MigrationClass>),
  );
