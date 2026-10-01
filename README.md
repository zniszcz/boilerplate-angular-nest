# boilerplate-angular-nest

Project template for new applications: an Nx monorepo with an Angular frontend
and a NestJS backend. Fork it when starting a new application.

Work in progress.

## Local development

There are three ways to run the project locally. In all of them both apps
reload automatically when a file changes.

| Option                               | Runs in Docker                       | Runs on your machine             | You need                            |
| ------------------------------------ | ------------------------------------ | -------------------------------- | ----------------------------------- |
| [A. Everything in Docker](#option-a) | PostgreSQL, Adminer, `api` and `web` | nothing                          | Docker                              |
| [B. Database in Docker](#option-b)   | PostgreSQL and Adminer               | `api` and `web`                  | Docker, [machine setup](#setup)     |
| [C. No Docker](#option-c)            | nothing                              | `api`, `web` and your PostgreSQL | PostgreSQL, [machine setup](#setup) |

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

Needs only Docker with Docker Compose. Node.js and pnpm run inside the
containers.

```sh
docker compose --profile apps watch
```

This one command starts the database, Adminer, the API and the web app, and
keeps them in sync with your files.

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

Needs Docker and the [machine setup](#setup).

```sh
docker compose up -d
pnpm dev
```

- `docker compose up` without a profile starts only PostgreSQL and Adminer.
- `pnpm dev` starts the API and the web app together, both with watchers,
  in one terminal. To run only one of them, use `pnpm nx serve api` or
  `pnpm nx serve web`.
- The API reads its defaults from `apps/api/.env.serve`, which points at the
  database from Docker.
- Stop the apps with `Ctrl+C` and the database with `docker compose down`.

<a id="option-c"></a>

### C. No Docker

Needs the [machine setup](#setup) and a PostgreSQL server you already have.
Create a database and a user for the project, then point the API at it in
`apps/api/.env.serve.local`:

```sh
echo 'DATABASE_URL=postgres://user:password@localhost:5432/database' > apps/api/.env.serve.local
pnpm dev
```

- `pnpm dev` works the same way as in option B.
- Files ending with `.local` are not committed, so your credentials stay on
  your machine.
- Values in `.env.serve.local` override the defaults from `.env.serve`.

<a id="setup"></a>

### Machine setup

Needed for options B and C, and for working on the code: linting, building
and the git hook that checks commit messages. Requires
[nvm](https://github.com/nvm-sh/nvm).

```sh
nvm install        # installs the Node.js version from .nvmrc
corepack enable    # provides the pnpm version from package.json
pnpm install       # installs dependencies and the git hooks
```

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

## Commands

These need the [machine setup](#setup).

| Command             | What it does                               |
| ------------------- | ------------------------------------------ |
| `pnpm dev`          | Runs the API and the web app with watchers |
| `pnpm build`        | Builds all apps                            |
| `pnpm lint`         | Runs ESLint in all projects                |
| `pnpm format`       | Formats all files with Prettier            |
| `pnpm format:check` | Checks formatting without changing files   |

## Workspace layout

| Path                    | Project     | Description                                                                |
| ----------------------- | ----------- | -------------------------------------------------------------------------- |
| `apps/api`              | `api`       | NestJS backend                                                             |
| `apps/web`              | `web`       | Angular frontend                                                           |
| `libs/shared/contracts` | `contracts` | Types shared by frontend and backend, imported as `@boilerplate/contracts` |

## Dependencies

- Versions are exact, without `^` or `~`. `saveExact` in
  `pnpm-workspace.yaml` keeps it that way for `pnpm add`.
- pnpm refuses to run on a Node.js version other than the one in `.nvmrc`
  (`devEngines` in `package.json`).
- A dependency that needs a build script must be allowed in `allowBuilds` in
  `pnpm-workspace.yaml`.
- Held back on purpose:
  - TypeScript on 6, because typescript-eslint, Angular and the NestJS CLI do
    not support 7 yet.
  - NestJS on 11, because Nx supports NestJS only up to 11.

## Linting and formatting

- ESLint 10 with the recommended rule sets of `@eslint/js`,
  typescript-eslint and angular-eslint, without local deviations.
- `@nx/enforce-module-boundaries` checks imports between projects.
- Prettier formats all files. `eslint-config-prettier` is applied last in
  `eslint.config.mjs`, so ESLint never reports formatting. Check with
  `pnpm exec eslint-config-prettier <file>`.
- `.editorconfig` matches the Prettier settings, so editors without Prettier
  produce the same formatting.

## Commit messages

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
A husky `commit-msg` hook runs commitlint on every commit. The check only
warns: a commit with a non-conforming message is still created. Hooks are
installed by `pnpm install` through the `prepare` script.
