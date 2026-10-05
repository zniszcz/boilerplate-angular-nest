# 0007. Default lint rule sets and module boundaries

- Status: Accepted
- Date: 2026-10-01

## Context

Lint rules should be strict but not a local invention, so they stay familiar
and easy to update.

## Decision

- ESLint with the recommended sets of `@eslint/js`, typescript-eslint and
  angular-eslint, without local deviations.
- `@nx/enforce-module-boundaries` as the first step towards an architecture
  linter for DDD. The DDD linter itself is chosen later.
- Prettier formats, and ESLint never reports formatting.
- Later, the lint configuration moves to its own repository published as a
  package. Where to publish it is still open.

## Consequences

- Rule changes come from upstream rule set updates, not local edits.
