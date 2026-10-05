# api

The NestJS API, which only wires the modules from `libs/api` together. The
rules are in [AGENTS.md](AGENTS.md). Configuration: [local development
setup](../../docs/development/setup.md#configuration).

## Commands in the image

The production image runs more than the API, all from the same build:

| Command           | What it does                                               | Where it runs                      |
| ----------------- | ---------------------------------------------------------- | ---------------------------------- |
| `node main.js`    | the API                                                    | the API container                  |
| `node migrate.js` | runs pending migrations; `revert` reverts the last one     | an initContainer before the API    |
| `node seed.js`    | writes all permissions and the test account                | locally and on test, never on prod |
| `node cleanup.js` | removes stale refresh tokens, without needing `JWT_SECRET` | a daily CronJob                    |

Locally they are Nx targets: `pnpm nx run api:migrate`, `api:seed`,
`api:cleanup`.

## Database

- The schema changes only through migration files. Automatic sync
  (`synchronize`) is never on, in any environment.
- Migration files are named `<timestamp>-<Name>.ts`. The build bundles every
  such file in `apps/api/src/database/migrations`, so a new migration needs no
  registration, and TypeORM runs them in timestamp order.
- The generator compares entities with the local database, so the database
  must be up to date before you generate.

### Adding a migration

1. Start the database: `docker compose up -d`.
2. Bring it up to date: `pnpm nx run api:migrate`.
3. Change the entity. A new entity also goes on its module's entity list,
   such as `USERS_ENTITIES`.
4. Generate: `pnpm nx run api:migration-generate --name=AddPhone`. Without
   `--name` the migration is called `Migration`.
5. Read the generated SQL.
6. Run it: `pnpm nx run api:migrate`. Check that it reverts:
   `pnpm nx run api:migrate-revert`, then `migrate` again.
7. Commit the entity and the migration together.

- Migrations run before the API starts: in Docker Compose in the `api`
  command, in the cluster in an initContainer of the same image
  (`node migrate.js`). A failed migration stops the new version, and the old
  one keeps running.
- Migrations and seed run at runtime, not at build time, because the build
  has no database.
- The seed command (`node seed.js`) writes all permissions and one test
  account from `SEED_USER_EMAIL` and `SEED_USER_PASSWORD`. It runs locally and
  on the test environment, never on production, because production must not
  have an account with a known password. It can run many times.
- `apps/api/src/database/data-source.ts` is the one database configuration
  for the app, the migrate and seed commands and the TypeORM CLI.
