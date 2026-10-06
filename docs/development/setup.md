# Local development setup

There are three ways to run the project locally. In all of them both apps
reload automatically when a file changes.

| Option                               | Runs in Docker                     | Runs on your machine                     | You need                                    |
| ------------------------------------ | ---------------------------------- | ---------------------------------------- | ------------------------------------------- |
| [A. Everything in Docker](#option-a) | databases, panels, `api` and `web` | nothing                                  | Docker                                      |
| [B. Databases in Docker](#option-b)  | databases and panels               | `api` and `web`                          | Docker, [machine setup](#setup)             |
| [C. No Docker](#option-c)            | nothing                            | `api`, `web`, your PostgreSQL and Valkey | PostgreSQL, Valkey, [machine setup](#setup) |

Databases are PostgreSQL and Valkey (compatible with Redis). Panels are
Adminer for PostgreSQL and RedisInsight for Valkey. The versions match the
cluster.

## Addresses

| Service      | Address                                  | Options |
| ------------ | ---------------------------------------- | ------- |
| API          | http://localhost:3000/api                | A, B, C |
| Web          | http://localhost:4200                    | A, B, C |
| Storybook    | http://localhost:4400 (`pnpm storybook`) | B, C    |
| Adminer      | http://localhost:8080                    | A, B    |
| RedisInsight | http://localhost:5540                    | A, B    |
| PostgreSQL   | `localhost:5432`                         | A, B    |
| Valkey       | `localhost:6379`                         | A, B    |

- Adminer login: system `PostgreSQL`, server `postgres`, and `app` as user,
  password and database.
- Valkey user `app`, password `app`. The `default` user is off, like in the
  cluster, so connections without a user fail with `NOAUTH`.
- RedisInsight asks you to accept its licence on first open. After that the
  `valkey` connection is on the list, already logged in.
- These credentials are for local development only.

<a id="option-a"></a>

## A. Everything in Docker

Needs only Docker with Docker Compose. Node.js and pnpm run inside the
containers.

```sh
docker compose --profile apps watch
```

This one command starts the databases, the panels, the API and the web app,
and keeps them in sync with your files.

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

## B. Databases in Docker, apps on your machine

Needs Docker and the [machine setup](#setup).

```sh
docker compose up -d
pnpm dev
```

- `docker compose up` without a profile starts only the databases and the
  panels.
- `pnpm dev` starts the API and the web app together, both with watchers,
  in one terminal. To run only one of them, use `pnpm nx serve api` or
  `pnpm nx serve web`.
- The apps read the root `.env`, which points at the databases from Docker.
- Stop the apps with `Ctrl+C` and the databases with `docker compose down`.

<a id="option-c"></a>

## C. No Docker

Needs the [machine setup](#setup), and a PostgreSQL server and a Valkey (or
Redis) server you already have. Create a database and a user for the
project, then point the API at both in the root `.env`:

```sh
DATABASE_URL=postgres://user:password@localhost:5432/database
REDIS_URL=redis://user:password@localhost:6379
```

- `pnpm dev` works the same way as in option B.
- `.env` is not committed, so your credentials stay on your machine.

<a id="setup"></a>

## Machine setup

Needed for options B and C, and for working on the code: linting, building
and the git hook that checks commit messages. Requires
[nvm](https://github.com/nvm-sh/nvm).

Working on the code also needs Docker, in every option: the API tests and
mutation testing start PostgreSQL in a container, and the `pre-push` hook
runs them. Option C runs the apps without Docker, but a push needs it. Why
the tests use a real database: [ADR 0021](../adr/0021-testing-strategy.md).

```sh
nvm install        # installs the Node.js version from .nvmrc
corepack enable    # provides the pnpm version from package.json
pnpm install       # installs dependencies and the git hooks
cp .env.example .env   # the one environment file, see Configuration
pnpm exec playwright install chromium   # the browser for pnpm e2e
```

## Configuration

One file: `.env` in the repository root, copied from
[`.env.example`](../../.env.example), which lists every variable with a
local default and a comment. Docker Compose reads it for the published
ports, and Nx loads it for every task, such as `nx serve api` or
`nx run api:migrate`. It is not committed. Inside Docker (option A) the
apps get their variables from `compose.yaml` instead.

A value may use another one, as `DATABASE_URL` uses `POSTGRES_PORT` and
`POSTGRES_DB`, so changing a port or a database name is one line.

## Ports

All ports bind to `127.0.0.1`, so they are not reachable from other machines.
If a port is already taken, for example by another project's database,
change it in `.env`, for example `POSTGRES_PORT=5442`.

The ports between `# per-instance-ports` markers belong to one instance of
the apps. `pnpm nx serve` uses the defaults of Angular, Storybook and the
Node.js debugger for the web app (4200), Storybook (4400) and the API
debugger (9229); the API listens on `API_PORT`. An isolated instance gets
its own block of these ports.
