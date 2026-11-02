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
- CI: GitHub-hosted runners; switches for a private fork in
  [CI runners](development/ci-runners.md).

## Read now

1. [Agent fleet](development/agent-fleet.md), about 10 minutes: how the
   manager, workers, reviewer and guard work, and how a task reaches `main`.
2. [CI runners](development/ci-runners.md), about 3 minutes: the default,
   and the two switches for a private fork.

## Waits for your decision

Nothing.

## Last review

2026-11-02: the agent fleet (`scripts/fleet/`, skills `manage-fleet`,
`review-project`, `tmux-handoff`, agent `docs-research`) and the CI runner
switch (`scripts/ci-runner.sh`, `scripts/ci-local.sh`).
