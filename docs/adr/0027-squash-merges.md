# 0027. One squashed commit per pull request

- Status: Accepted
- Date: 2026-10-06

## Context

Pull requests were merged by rebase, so every working commit of a branch
landed on `main`. With agents working on many branches, `main` would fill
with small steps, and merged branches stayed on GitHub until someone
removed them.

## Decision

- **Squash merge only.** The pull request title becomes the commit subject
  on `main`, its description the commit body.
- **The title follows Conventional Commits**, checked by the workflow
  "Check the title follows Conventional Commits" with the same commitlint
  rules as local commits.
- **The branch is deleted after the merge.**
- These are repository settings, not files, so `scripts/github-settings.sh`
  applies them. Run it once in every fork.

Rejected: rebase merges, because every working commit lands on `main`.
Rejected: merge commits, because they make the history a graph that is
harder to read and to revert.

## Consequences

- One commit on `main` per change, easy to revert as a whole.
- Commits inside a branch may be small and rough; only the title must be
  right.
