# 0005. Nx monorepo with logic in libraries

- Status: Accepted
- Date: 2026-10-01

## Context

Frontend and backend share types and are deployed together. The template
should also be ready for an architecture linter that enforces DDD layers.

## Decision

- One Nx 23 monorepo: `apps/web` (Angular), `apps/api` (NestJS), later
  `apps/e2e` and `apps/storybook`.
- Logic lives in libraries: `libs/api/<domain>`, `libs/web/<feature>`,
  `libs/web/ui`, `libs/shared/contracts`. Apps only wire things together.
- One Dockerfile per app.

The reason for libraries: Nx checks allowed dependencies
(`@nx/enforce-module-boundaries`) between projects, not between folders inside
one project.

## Consequences

- Every domain or feature needs its own library, created with an Nx generator.
- Module boundary tags are the seed of the architecture linter.
