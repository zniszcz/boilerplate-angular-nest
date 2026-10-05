# Conventions

## Pinned versions

Why: [ADR 0004](../adr/0004-exact-versions.md). We always lock exact versions of everything: Node.js, pnpm and every
dependency.

- Dependencies are saved without `^` or `~`. `saveExact` in
  `pnpm-workspace.yaml` makes `pnpm add` do this automatically.
- `pnpm versions` (syncpack, rules in `.syncpackrc.json`) fails on any range.
  A pre-commit hook runs it when `package.json` changes, because generators,
  such as the spartan CLI, can still write `^`. Fix with
  `pnpm exec syncpack fix`.
- `pnpm-lock.yaml` is committed, so every install gets the same dependency
  tree.
- pnpm refuses to run on a Node.js version other than the one in `.nvmrc`
  (`devEngines` in `package.json`).
- Always install packages from the repository root, for example
  `pnpm add -D some-package`. This is an Nx monorepo with a single
  `package.json` shared by all apps and libraries, so the projects in `apps/`
  and `libs/` have no `package.json` of their own.
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
