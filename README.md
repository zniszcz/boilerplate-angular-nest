# boilerplate-angular-nest

Project template for new applications: an Nx monorepo with an Angular frontend
and a NestJS backend. Fork it when starting a new application.

Work in progress.

## Pinned versions

| Tool | Version | Where it is pinned |
|---|---|---|
| Node.js | 24.21.0 | `.nvmrc`, `engines.node`, `devEngines.runtime` |
| pnpm | 12.8.1 | `packageManager`, `engines.pnpm`, `devEngines.packageManager` |
| TypeScript | 6.0.3 | `devDependencies` |

- `devEngines.runtime` with `onFail: "error"` makes pnpm refuse to run on any
  other Node.js version.
- `pnpm-workspace.yaml` sets `saveExact: true`, so new dependencies are saved
  without `^` or `~`.
- `pnpm-lock.yaml` is committed. CI installs with `pnpm install --frozen-lockfile`.
- TypeScript stays on 6.0 because typescript-eslint, Angular and the NestJS CLI
  do not support 7.0 yet.

## Getting started

```sh
nvm use
corepack enable
pnpm install
```
