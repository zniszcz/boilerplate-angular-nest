# CI runners

CI runs on GitHub-hosted runners. This repository is public, so their
minutes are free, and nothing here needs a runner of your own. A private
fork pays for minutes, though, and may prefer one of two ways out: its own
self-hosted runners, or the same checks run locally. Both are switches; the
default never changes. Why: [ADR 0033](../adr/0033-ci-runner-switch.md).

## The switch

Every job in [`.github/workflows`](../../.github/workflows) has

```yaml
runs-on: ${{ vars.CI_RUNNER || 'ubuntu-24.04' }}
```

Without the repository variable `CI_RUNNER` every job runs on
`ubuntu-24.04`, as before. With `CI_RUNNER=self-hosted` (or any label of
your runners) every job waits for a runner with that label.
`scripts/ci-runner.sh check`, run in CI, fails when a job does not follow
the switch.

```sh
scripts/ci-runner.sh status                 # the variable and your runners
scripts/ci-runner.sh use-self-hosted        # set CI_RUNNER=self-hosted
scripts/ci-runner.sh use-hosted             # delete it: back to GitHub
```

`use-self-hosted` refuses a public repository and a label no online runner
carries, unless you add `--force`: on a public repository a pull request
from a fork would run its code on your machine, and without a runner every
job would wait forever.

## Self-hosted runners

A runner is a program from GitHub that takes jobs of one repository. It
needs Linux or macOS with Docker (API tests, end-to-end and images), Node.js
from `.nvmrc` with Corepack (`corepack enable`), `git`, `python3`, and once,
with root, the system libraries of Chromium, because the end-to-end job
skips that step on a self-hosted runner:

```sh
pnpm exec playwright install-deps chromium   # once, needs sudo
```

Register one in a folder of your choice and keep it running:

```sh
scripts/ci-runner.sh register ~/actions-runners/r1   # download, check the SHA-256, register
cd ~/actions-runners/r1 && ./run.sh                  # or: sudo ./svc.sh install && sudo ./svc.sh start
scripts/ci-runner.sh use-self-hosted
```

More runners run jobs side by side: register `r2`, `r3` in their own
folders. Remove one with `scripts/ci-runner.sh unregister <dir>`. While
`CI_RUNNER` is set, jobs wait when the machine is off; switch back with
`use-hosted`. The image job pushes to GHCR from your machine, and caches
still go to GitHub's cache service.

## Checks without CI

The same checks as [`checks.yml`](../../.github/workflows/checks.yml), on
your machine, in a throwaway worktree at the pushed head of a branch or pull
request, so your working copy is never touched:

```sh
scripts/ci-local.sh                 # the current branch, pushed
scripts/ci-local.sh 42 --post       # pull request 42; posts the report and a commit status
GATES_ONLY=lint,test scripts/ci-local.sh
```

The list of checks is [`scripts/fleet/gates.list`](../../scripts/fleet/gates.list);
test, mutation testing and end-to-end need Docker. With `--post` the report
goes to the pull request as a comment and the head commit gets the status
`local-checks`, which branch protection can require like any CI check. The
[agent fleet](agent-fleet.md) uses the same script when
`FLEET_GATES=local` in `scripts/fleet/fleet.conf`.

To stop paying for minutes on a private fork without any runner, disable
the workflows (`gh workflow disable <name>`), set `FLEET_GATES=local` and
run `scripts/ci-local.sh <nr> --post` before each merge.
