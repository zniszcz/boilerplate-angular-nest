# boilerplate-angular-nest

Project template for new applications: an Nx monorepo with an Angular frontend
and a NestJS backend. Fork it when starting a new application.

Work in progress.

## Getting started

Requirements: [nvm](https://github.com/nvm-sh/nvm), and Docker with
Docker Compose for options A and B.

```sh
nvm install        # installs the Node.js version from .nvmrc
corepack enable    # provides the pnpm version from package.json
pnpm install       # also installs the git hooks
pnpm build         # checks that everything compiles
```

Then pick one of the [local development options](#local-development).

## Local development

There are three ways to run the project locally. In all of them the apps
reload automatically when a file changes.

| Option                               | Runs in Docker                       | Runs on your machine             | Needs Docker |
| ------------------------------------ | ------------------------------------ | -------------------------------- | ------------ |
| [A. Everything in Docker](#option-a) | PostgreSQL, Adminer, `api` and `web` | nothing                          | yes          |
| [B. Database in Docker](#option-b)   | PostgreSQL and Adminer               | `api` and `web`                  | yes          |
| [C. No Docker](#option-c)            | nothing                              | `api`, `web` and your PostgreSQL | no           |

All options first need the [setup](#getting-started) steps.

### Addresses

| Service    | Address                   | Options |
| ---------- | ------------------------- | ------- |
| API        | http://localhost:3000/api | A, B, C |
| Web        | http://localhost:4200     | A, B, C |
| Adminer    | http://localhost:8080     | A, B    |
| PostgreSQL | `localhost:5432`          | A, B    |

Adminer login: system `PostgreSQL`, server `postgres`, and `app` as user,
password and database. These credentials are for local development only.

<a id="option-a"></a>

### A. Everything in Docker

```sh
docker compose --profile apps watch
```

- Source code reaches the containers through `docker compose watch` sync,
  not a bind mount. Saving a file in `apps/` or `libs/` copies it into the
  container, and the app reloads.
- Changing `package.json` or `pnpm-lock.yaml` rebuilds the image.
- Each app has its own `Dockerfile`. The `dev` stage runs `nx serve`.
- Nx turns off its daemon inside Docker, but `nx serve api` needs it to
  restart on change, so the `dev` stage sets `NX_DAEMON=true`.
- Environment variables come from `compose.yaml`.
- Stop with `Ctrl+C`, then `docker compose --profile apps down`.

<a id="option-b"></a>

### B. Database in Docker, apps on your machine

```sh
docker compose up -d
pnpm nx serve api
pnpm nx serve web
```

Run the two `nx serve` commands in separate terminals.

- `docker compose up` without a profile starts only PostgreSQL and Adminer.
- `nx serve api` reads its defaults from `apps/api/.env.serve`, which points
  at the database from Docker.
- Stop the database with `docker compose down`.

<a id="option-c"></a>

### C. No Docker

Use a PostgreSQL server you already have. Create a database and a user for
the project, then point the API at it in `apps/api/.env.serve.local`:

```sh
echo 'DATABASE_URL=postgres://user:password@localhost:5432/database' > apps/api/.env.serve.local
pnpm nx serve api
pnpm nx serve web
```

- Files ending with `.local` are not committed, so your credentials stay on
  your machine.
- Values in `.env.serve.local` override the defaults from `.env.serve`.

### Configuration

| Variable       | Meaning                                                                           | Default outside Docker | Default in Docker |
| -------------- | --------------------------------------------------------------------------------- | ---------------------- | ----------------- |
| `PORT`         | API port                                                                          | `3000`                 | `3000`            |
| `LOG_LEVEL`    | `fatal`, `error`, `warn`, `log` (alias `info`), `debug` or `verbose`              | `debug`                | `debug`           |
| `MEDIA_DIR`    | Directory for media files, the same path as in the cluster when running in Docker | `tmp/media`            | `/app/media`      |
| `DATABASE_URL` | PostgreSQL connection string                                                      | Docker database        | Docker database   |

Outside Docker, Nx loads environment files for `nx serve api` in this order,
and the first value found wins:

1. `apps/api/.env.serve.local` (your overrides, not committed)
2. `apps/api/.env.serve` (committed defaults)
3. `.env` in the repository root (not committed)

### Ports

All ports bind to `127.0.0.1`, so they are not reachable from other machines.
If a port is already taken, for example by another project's database, copy
`.env.example` to `.env` and change the port there:

```sh
cp .env.example .env
# then set for example POSTGRES_PORT=5442
```

Docker Compose and the API defaults both read `POSTGRES_PORT`, so options A
and B keep working without other changes.

The other ports in `.env` change only the ports Docker publishes. To change
the port of `nx serve api` on your machine, set `PORT` in
`apps/api/.env.serve.local`.

## Workspace layout

| Path                    | Project     | Description                                                                |
| ----------------------- | ----------- | -------------------------------------------------------------------------- |
| `apps/api`              | `api`       | NestJS backend                                                             |
| `apps/web`              | `web`       | Angular frontend                                                           |
| `libs/shared/contracts` | `contracts` | Types shared by frontend and backend, imported as `@boilerplate/contracts` |

The workspace uses Nx 23.2.1. Dependency build scripts must be allowed
explicitly in `allowBuilds` in `pnpm-workspace.yaml`.

## Pinned versions

| Tool       | Version | Where it is pinned                                            |
| ---------- | ------- | ------------------------------------------------------------- |
| Node.js    | 24.21.0 | `.nvmrc`, `engines.node`, `devEngines.runtime`                |
| pnpm       | 12.8.1  | `packageManager`, `engines.pnpm`, `devEngines.packageManager` |
| TypeScript | 6.0.3   | `devDependencies`                                             |
| Nx         | 23.2.1  | `devDependencies`                                             |
| Angular    | 22.2.1  | `dependencies`, `devDependencies`                             |
| NestJS     | 11.2.7  | `dependencies`, `devDependencies`                             |

- `devEngines.runtime` with `onFail: "error"` makes pnpm refuse to run on any
  other Node.js version.
- `pnpm-workspace.yaml` sets `saveExact: true`, so new dependencies are saved
  without `^` or `~`.
- `pnpm-lock.yaml` is committed. CI installs with `pnpm install --frozen-lockfile`.
- TypeScript stays on 6.0 because typescript-eslint, Angular and the NestJS CLI
  do not support 7.0 yet.
- NestJS stays on 11 because Nx 23 supports NestJS only up to 11. Upgrade to
  12 once Nx supports it.

## Linting and formatting

- ESLint 10 with the recommended rule sets of `@eslint/js`,
  typescript-eslint and angular-eslint, without local deviations.
- `@nx/enforce-module-boundaries` checks imports between projects.
- Prettier formats all files. `eslint-config-prettier` is applied last in
  `eslint.config.mjs`, so ESLint never reports formatting. Check with
  `pnpm exec eslint-config-prettier <file>`.
- `.editorconfig` matches the Prettier settings, so editors without Prettier
  produce the same formatting.

```sh
pnpm lint
pnpm format:check
pnpm format
```

## Commit messages

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
A husky `commit-msg` hook runs commitlint on every commit. The check only
warns: a commit with a non-conforming message is still created. Hooks are
installed by `pnpm install` through the `prepare` script.
