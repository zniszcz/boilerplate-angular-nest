# Local development setup

There are three ways to run the project locally, and a fourth to run a branch beside it. In all of them both apps
reload automatically when a file changes.

| Option                               | Runs in Docker                     | Runs on your machine                     | You need                                    |
| ------------------------------------ | ---------------------------------- | ---------------------------------------- | ------------------------------------------- |
| [A. Everything in Docker](#option-a) | databases, panels, `api` and `web` | nothing                                  | Docker                                      |
| [B. Databases in Docker](#option-b)  | databases and panels               | `api` and `web`                          | Docker, [machine setup](#setup)             |
| [C. No Docker](#option-c)            | nothing                            | `api`, `web`, your PostgreSQL and Valkey | PostgreSQL, Valkey, [machine setup](#setup) |
| [Instance of a branch](#instances)   | databases and panels, shared       | `api` and `web` of the branch            | option B running in the main checkout       |

Databases are PostgreSQL and Valkey (compatible with Redis). Panels are
Adminer for PostgreSQL and RedisInsight for Valkey. The versions match the
cluster.

## Addresses

| Service      | Address                                   | Options |
| ------------ | ----------------------------------------- | ------- |
| API          | http://localhost:41001/api                | A, B, C |
| Web          | http://localhost:41000                    | A, B, C |
| Storybook    | http://localhost:41002 (`pnpm storybook`) | B, C    |
| Adminer      | http://localhost:8080                     | A, B    |
| RedisInsight | http://localhost:5540                     | A, B    |
| PostgreSQL   | `localhost:5432`                          | A, B    |
| Valkey       | `localhost:6379`                          | A, B    |

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
cp .env.example .env   # once; see Configuration
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
- The containers read the root `.env`, like the other options;
  `compose.yaml` overrides only what differs inside a container: the
  database and Valkey host names and the media path.
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

<a id="instances"></a>

## Isolated instance of a branch

Runs a branch next to the main checkout without touching it: its own git
worktree, ports, database and Valkey database, on the databases and panels
of option B. Needs option B's containers running in the main checkout and
the [machine setup](#setup). Why it works like this:
[ADR 0030](../adr/0030-isolated-instances.md).

```sh
pnpm instance up feat/orders     # create, or start again, and wait until ready
pnpm instance list               # all instances, their addresses and state
pnpm instance stop feat/orders   # stop its apps, keep the worktree and data
pnpm instance down feat/orders   # remove it, unless work would be lost
pnpm instance sweep              # remove those whose pull request is merged
```

```mermaid
stateDiagram-v2
    [*] --> Running: up, on a free slot
    Running --> Running: a port is taken, up moves to the next slot
    Running --> Stopped: stop
    Stopped --> Running: up
    Running --> Removed: down, or sweep after the merge
    Stopped --> Removed: down, or sweep after the merge
    Removed --> [*]
    note right of Removed
        down refuses while there are uncommitted changes
        or commits that no other branch or remote has
    end note
```

- The worktree is `../<repository>--<branch>`. Work there as in any
  checkout; its `.env` is a copy of the main one with the instance's values.
- Slot N, from 1 to `INSTANCE_LIMIT` (3 by default), has the ports from 41000 + 10·N, after the main
  checkout's 41000: web +0, API +1,
  Storybook +2, API debugger +3, in the order of the
  `# per-instance-ports` block in `.env.example`. To add an app to the
  block, add its port variable at the end of that block; to remove one,
  delete its line. Existing instances keep their old `.env` until they are
  created again.
- The last line of every command is JSON for scripts and agents. The full
  log, and each app's output, are in `tmp/instances/` of the main checkout.

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
local default and a comment. Every way of running the project reads it:
Docker Compose for its services and, in option A, for the containers of the
apps; Nx for every task, such as `nx serve api` or `nx run api:migrate`. It
is not committed. Create it before the first start; Compose refuses to
start the apps without it.

A value may use another one, as `DATABASE_URL` uses `POSTGRES_PORT` and
`POSTGRES_DB`, so changing a port or a database name is one line.

## Ports

All ports bind to `127.0.0.1`, so they are not reachable from other machines.
If a port is already taken, for example by another project's database,
change it in `.env`, for example `POSTGRES_PORT=5442`.

The ports between `# per-instance-ports` markers belong to one instance of
the apps, in a block of ten: the main checkout has 41000 to 41003, an
isolated instance in slot N the same offsets from 41000 + 10·N. The web
dev server, Storybook and the API debugger take their defaults from
`project.json`, because Nx options cannot read `.env`; keep those equal to
`.env.example`. The API listens on `API_PORT`.
