# 0033. GitHub-hosted runners by default, with a switch to self-hosted or local checks

- Status: Accepted
- Date: 2026-11-02

## Context

CI runs on GitHub-hosted runners ([ADR 0019](0019-ci-pipeline.md),
[ADR 0025](0025-ci-jobs-and-caches.md)). This repository is public, so that
costs nothing. A fork is often private, where the same CI uses paid minutes,
and an agent fleet ([ADR 0032](0032-agent-fleet.md)) pushes many branches a
day. The fork needs a way off hosted runners that does not change the
template's default and cannot drift from the real checks.

## Decision

- Every job has `runs-on: ${{ vars.CI_RUNNER || 'ubuntu-24.04' }}`. Without
  the repository variable `CI_RUNNER` nothing changes; with it every job goes
  to runners with that label. The only other difference is the step that
  installs Chromium's system libraries with `sudo`, skipped when `CI_RUNNER`
  is set; a self-hosted runner installs them once.
- `scripts/ci-runner.sh` shows the state, switches both ways, registers a
  runner (download with its SHA-256 checked) and checks that every job
  follows the switch; CI runs that check. Switching refuses a public
  repository and a label no online runner carries, unless forced.
- `scripts/ci-local.sh` runs the checks of `checks.yml`, listed in
  `scripts/fleet/gates.list`, in a throwaway worktree at a pushed head, and
  can post the report and a `local-checks` commit status for branch
  protection. The agent fleet uses it when `FLEET_GATES=local`.

Rejected: self-hosted runners for this repository, because hosted minutes
are free for a public one and a pull request from a fork would run its code
on the owner's machine; a separate workflow file for self-hosted runners,
because two copies of the checks drift apart; a JSON list of labels in the
variable, because one label is enough and a plain string is easier to set.

## Consequences

- The default behaviour of this repository does not change.
- A new job must use the switch, or `scripts/ci-runner.sh check` fails CI.
- A new check goes to `checks.yml` and to `scripts/fleet/gates.list`.
- How to use it: [CI runners](../development/ci-runners.md).
