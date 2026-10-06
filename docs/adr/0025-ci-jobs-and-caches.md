# 0025. CI in five parallel jobs with caches and a summary

- Status: Accepted
- Date: 2026-10-06

## Context

The verify job of [ADR 0019](0019-ci-pipeline.md) had grown to 16 steps in
one list. A failure meant scrolling a long log to find which check failed,
and every step waited for the one before it.

## Decision

- **Five jobs side by side, one per kind of check**: Static checks, Build
  and Storybook, Unit and API tests, Mutation testing, End-to-end. Each
  step has a name that says what it checks. Images wait for all five.
- **One setup** in `.github/actions/setup`: Node.js, pnpm, dependencies from
  the cached pnpm store, and the job's own Nx cache.
- **Caches**, each restored from the branch's latest or else `main`'s
  ([ADR 0024](0024-ci-on-every-branch.md)) and saved on pushes:
  - the Nx cache per job, so lint, build and tests skip unchanged projects.
    Nx still checks the whole repository: a cached result counts only when
    nothing it depends on changed, so this is not `nx affected`,
  - Stryker results ([ADR 0022](0022-mutation-testing.md)),
  - Chromium per lockfile; its system libraries still come from apt.
- **One short summary on the run's page**, written by a Summary job after
  the five, even when one failed: `scripts/ci-summary.mjs` gives a line per
  job with its result and key number, such as the mutation score or the
  scenarios passed, and lists details only for what failed. Test failures
  show as annotations from Vitest.
- **Reports as artifacts on failure**: the Stryker HTML report and the E2E
  report with traces.

Rejected: one job with groups in its log, because the graph would still
show one box.

## Consequences

- Each job installs dependencies itself, about 10 seconds from the cache;
  the jobs run at once, so the run is as long as the slowest job.
- Caches take space; GitHub removes those unused for 7 days.
