# What to read

The first file for the human who owns this repository. It stays short: a
pull request that adds a document, an ADR, a command or a decision for you
updates this file in the same pull request, and the agent fleet's audit
reports it when it falls behind.

## How to start

- The apps: [README](../README.md#quick-start).
- The agent fleet: `./resume-manager.sh`, one command that starts or
  resumes the manager. Never `claude --continue`. See
  [Agent fleet](development/agent-fleet.md).
- Shutting the fleet down (tmux sessions and every background process):
  the skill `shutdown-fleet`; try `scripts/fleet/fleet-shutdown.sh --dry-run`
  first. By default it lets running work finish; `--force` kills at once.
  Afterwards `.fleet/resume.md` says how to come back.
- CI: GitHub-hosted runners; switches for a private fork in
  [CI runners](development/ci-runners.md).

## Read now

1. [Agent fleet](development/agent-fleet.md), about 10 minutes: how the
   manager, workers, reviewer and guard work, and how a task reaches `main`.
2. [CI runners](development/ci-runners.md), about 3 minutes: the default,
   and the two switches for a private fork.
3. [ADR 0034](adr/0034-fleet-shutdown.md), about 3 minutes: how
   `shutdown-fleet` makes sure every conversation can be resumed before it
   kills anything.

## Waits for your decision

Nothing.

## Last review

2026-11-03: the skill `shutdown-fleet` and
`scripts/fleet/fleet-shutdown.sh` ([ADR 0034](adr/0034-fleet-shutdown.md)).

2026-11-02: the agent fleet (`scripts/fleet/`, skills `manage-fleet`,
`review-project`, `tmux-handoff`, agent `docs-research`) and the CI runner
switch (`scripts/ci-runner.sh`, `scripts/ci-local.sh`).
