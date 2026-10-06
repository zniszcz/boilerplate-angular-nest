# 0031. Storybook runs in every isolated instance

- Status: Accepted
- Date: 2026-10-06

## Context

[ADR 0030](0030-isolated-instances.md) reserved a Storybook port in each
instance's block but left Storybook stopped, to save memory. Reviewing a
feature's components then meant starting it by hand in the worktree.

## Decision

Storybook is in `INSTANCE_APPS` in `.env.example`, so every instance and
the main checkout's `pnpm storybook` run it with `nx serve storybook` on
`STORYBOOK_PORT`. Its target is named `serve`, like every app's.

Rejected: starting it on demand only, because forgetting it was the
problem.

## Consequences

- Each instance uses more memory, accepted for now.
- Removing `storybook` from `INSTANCE_APPS` in `.env` turns it off for new
  instances.
