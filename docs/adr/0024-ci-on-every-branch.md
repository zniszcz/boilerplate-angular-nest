# 0024. CI on every push to any branch, trunk-based

- Status: Accepted
- Date: 2026-10-06

## Context

[ADR 0019](0019-ci-pipeline.md) ran CI on pushes to `main` and on pull
requests. A branch got no feedback until someone opened a pull request. The
work is trunk-based: short branches merged into `main`, no `develop`.
Mutation testing made a cold CI run take over 6 minutes, so a branch must
not start from nothing.

## Decision

- **Every push to any branch runs the verify job.** Pull requests run it
  only when they come from a fork, whose pushes run no CI here; otherwise
  the push run already checked the same commit.
- **Images are still built only on `main`**, as in ADR 0019.
- **Caches fork from `main`.** GitHub lets a branch read its own caches and
  those of the default branch. A new branch starts from `main`'s Stryker
  results, then saves its own under `mutation-<branch>-<sha>`; the nightly
  full run refreshes `main`'s. pnpm's store cache works the same way.

Rejected: a `develop` branch as the cache source, because only the default
branch's caches are visible to other branches, and the flow is trunk-based.

## Consequences

- Feedback on the first push of a branch, without a pull request.
- A branch's first run checks only the mutants that differ from `main`.
- Caches of finished branches expire after 7 days unused.
