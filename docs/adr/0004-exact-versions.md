# 0004. Exact versions of everything

- Status: Accepted
- Date: 2026-10-01

## Context

An install must give the same result on every machine and in CI, so that
"works on my machine" cannot happen.

## Decision

- pnpm with an exact version in `packageManager`, and `devEngines` that
  refuses another Node.js or pnpm version.
- Dependencies saved without `^` and `~` (`saveExact`).
- The lockfile is committed. CI installs with `--frozen-lockfile`.
- Docker base images use an exact tag, such as `node:24.21.0-slim`, without
  a digest. Rejected: digests, as too much work to update by hand.

## Consequences

- Updates are deliberate. Renovate is planned to propose them.
- Every new dependency needs its exact version.
