# boilerplate-angular-nest

Project template for new applications: an Nx monorepo with an Angular frontend
and a NestJS backend. Fork it when starting a new application.

Work in progress.

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

## Workspace layout

| Path                    | Project     | Description                                                                |
| ----------------------- | ----------- | -------------------------------------------------------------------------- |
| `apps/api`              | `api`       | NestJS backend                                                             |
| `apps/web`              | `web`       | Angular frontend                                                           |
| `libs/shared/contracts` | `contracts` | Types shared by frontend and backend, imported as `@boilerplate/contracts` |

The workspace uses Nx 23.2.1. Dependency build scripts must be allowed
explicitly in `allowBuilds` in `pnpm-workspace.yaml`.

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

## Getting started

```sh
nvm use
corepack enable
pnpm install
pnpm build
```
