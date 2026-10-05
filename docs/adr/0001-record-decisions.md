# 0001. Record decisions in ADRs and rules in AGENTS.md

- Status: Accepted
- Date: 2026-10-05

## Context

Decisions about this template were kept as notes outside the repository, in
Polish. A fork did not get them, and coding agents could not see them. The
README mixed instructions with rules.

## Decision

- Why a decision was made goes to an ADR in `docs/adr`, in English, using
  [template.md](template.md) (Michael Nygard's format).
- What the code must follow goes to `AGENTS.md` files. A rule sits in the
  deepest directory it applies to as a whole, and is not repeated above or
  below. A rule links to its ADR instead of repeating the reasons.
- Each `AGENTS.md` has a `CLAUDE.md` next to it with the single line
  `@AGENTS.md`, because Claude Code reads only `CLAUDE.md`. Other agents read
  `AGENTS.md` directly.
- The README keeps instructions: how to run, build and change things.

Rejected: decision notes outside the repository, because forks lose them.

## Consequences

- An agent working in `libs/api/users` reads the root, `libs/api` and any
  deeper `AGENTS.md`, so it gets only the rules that apply there.
- Changing a decision means a new ADR, so the history stays readable.
