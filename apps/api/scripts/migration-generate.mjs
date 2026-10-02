// Generates a migration from the difference between entities and the local
// database. Usage: pnpm nx run api:migration-generate [--name=AddPhone]
// Without --name the migration is called Migration.
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: { name: { type: 'string', default: 'Migration' } },
  strict: false,
});
const dir = 'apps/api/src/database/migrations';
const run = (command, args) =>
  execFileSync(command, args, { stdio: 'inherit', shell: false });

run('typeorm', [
  'migration:generate',
  '-d',
  'dist/apps/api/data-source.js',
  `${dir}/${values.name}`,
]);
run('prettier', ['--write', dir]);
