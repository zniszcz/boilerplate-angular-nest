# 0032. An agent fleet: a manager in tmux, workers in isolated instances, a guard

- Status: Accepted
- Date: 2026-11-02

## Context

AI agents do most of the routine work here ([ADR 0028](0028-agent-skills.md)),
one feature at a time through `ship-feature`. A single session waits for its
human at every decision, works on one thing, and stops when the human sleeps.
A way of working with several agents at once was tried on other projects and
corrected by what went wrong there: one session as a manager that writes no
code, several workers each in its own worktree, a reviewer once a night, and
a guard that wakes the manager. It needs to be written down so a fork can use
it, and so a plain Claude Code session can say how to start it.

## Decision

- The fleet's scripts live in `scripts/fleet/`, Bash with the repository's
  settings in `scripts/fleet/fleet.conf`, and tests in
  `scripts/fleet/tests/` in Python's standard library, run in CI. The
  manager's skill and the worker and reviewer briefs are in
  `.agents/skills/manage-fleet/`; the reviewer has `review-project`.
- One command starts and resumes it: `resume-manager.sh`. The manager's
  conversation is resumed by its saved id, never with `--continue`, which
  picks the newest conversation in the folder, usually a worker's. The top of
  `AGENTS.md` and the README say so.
- A worker follows `ship-feature` in an isolated instance
  ([ADR 0030](0030-isolated-instances.md)); assumptions replace questions, and
  the manager's word replaces the user's for a merge. Workers report in files
  under `.fleet/`, never talk to the human, never merge or deploy alone.
- The guard wakes the manager after a still screen or on a worker's event
  from a durable queue, and never types while it works or over unsent text.
- Pull requests are checked by GitHub Actions by default; a fork without free
  CI sets `FLEET_GATES=local` and runs the same checks locally
  ([ADR 0033](0033-ci-runner-switch.md)). The manager reviews every pull
  request; no paid external reviewers.
- [docs/what-to-read.md](../what-to-read.md) is the guide for the human,
  updated in the pull request that adds a document, an ADR or a command; the
  fleet's audit reports it when it falls behind.

Rejected: a cron in the manager's session, because it typed into the middle
of a human's sentence; scripts in `.agents/skills/manage-fleet/scripts/`,
because they print text for a person, not the one JSON line of ADR 0028;
Node.js for the tests, because the scripts are Bash and Python's
`unittest` needs no install.

## Consequences

- The fleet needs `tmux`, `gh`, `python3` and Claude Code on a Linux or macOS
  machine; nothing of it runs in the apps.
- `.fleet/`, `scripts/fleet/guard.conf`, `fleet.stop` and `fleet.pause` are
  outside git.
- A fork changes `scripts/fleet/fleet.conf` and, when its checks change,
  `scripts/fleet/gates.list`.
- How it works: [Agent fleet](../development/agent-fleet.md).
