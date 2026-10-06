# boilerplate-angular-nest

[![CI](https://github.com/zniszcz/boilerplate-angular-nest/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/zniszcz/boilerplate-angular-nest/actions/workflows/ci.yml?query=branch%3Amain)

Project template for new applications: an Nx monorepo with an Angular frontend
and a NestJS backend. Fork it when starting a new application.

## Quick start

Everything in Docker, nothing else to install:

```sh
docker compose --profile apps watch
```

Or databases in Docker and the apps on your machine, after the
[machine setup](docs/development/setup.md#machine-setup):

```sh
docker compose up -d
pnpm dev
```

Log in at http://localhost:4200 as `admin@example.com` with the password
`admin`. Other ways to run it, configuration and ports:
[local development setup](docs/development/setup.md).

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

## Commands

These need the [machine setup](docs/development/setup.md#machine-setup).
`pnpm test`, `pnpm mutate`, `pnpm e2e` and `git push`, whose hook runs
mutation testing, also need Docker.

| Command                                                 | What it does                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm dev`                                              | Runs the API and the web app with watchers                                                   |
| `pnpm storybook`                                        | Runs Storybook for the web UI at http://localhost:4400                                       |
| `pnpm build`                                            | Builds all apps                                                                              |
| `pnpm lint`                                             | Runs ESLint in all projects                                                                  |
| `pnpm test`                                             | Runs unit and API tests; API tests need Docker                                               |
| `pnpm mutate`                                           | Mutation testing of backend domain and application layers with Stryker                       |
| `pnpm e2e`                                              | Builds both apps and runs the `.feature` scenarios in Chromium; needs Docker                 |
| `scripts/github-settings.sh`                            | Applies the GitHub settings: squash merges only, branches deleted after merge; once per fork |
| `pnpm architecture`                                     | Checks DDD layers and cycles with dependency-cruiser                                         |
| `pnpm versions`                                         | Fails when a dependency in `package.json` has a range instead of an exact version            |
| `pnpm docs:generate`                                    | Regenerates the lists in the docs: projects, concepts, ADR index, agent skills               |
| `pnpm docs:check`                                       | Fails when those lists are out of date or a skill breaks its rules                           |
| `pnpm skills:link`                                      | Links each skill in `.agents/skills` for Claude Code                                         |
| `pnpm format`                                           | Formats all files with Prettier                                                              |
| `pnpm format:check`                                     | Checks formatting without changing files                                                     |
| `pnpm contracts:generate`                               | Regenerates API types in `libs/shared/contracts`                                             |
| `pnpm contracts:check`                                  | Fails when the generated API types are out of date                                           |
| `pnpm nx run api:migrate`                               | Runs pending migrations                                                                      |
| `pnpm nx run api:migrate-revert`                        | Reverts the last migration                                                                   |
| `pnpm nx run api:migration-generate [--name=AddOrders]` | Generates a migration from the difference between entities and the database                  |
| `pnpm nx run api:seed`                                  | Writes permissions and the test account                                                      |
| `pnpm nx run api:cleanup`                               | Removes expired refresh tokens and those of sessions ended over 7 days ago                   |

## Documentation

Building a feature? Start with [CONTRIBUTING.md](CONTRIBUTING.md): the
recommended workflow, step by step.

| Read                                                     | For                                                |
| -------------------------------------------------------- | -------------------------------------------------- |
| [docs/README.md](docs/README.md)                         | architecture: context, building blocks, deployment |
| [docs/concepts](docs/README.md#8-cross-cutting-concepts) | how login, the API contract and the frontend work  |
| [docs/adr](docs/adr/README.md)                           | why each decision was made                         |
| [docs/development](docs/development/conventions.md)      | versions, linting, commit messages                 |
| [CONTRIBUTING.md](CONTRIBUTING.md)                       | how a feature gets from an idea to `main`          |
| [AGENTS.md](AGENTS.md)                                   | rules for code, for people and AI agents alike     |
| [.agents/skills](.agents/skills/README.md)               | skills that carry out the workflow for AI agents   |
