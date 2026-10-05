# 0020. Documentation in the shape of arc42, next to the code

- Status: Accepted
- Date: 2026-10-06

## Context

The root README had grown to 450 lines: setup, every mechanism and every
convention in one file. People had to scroll past what they did not need, and
an AI agent had to load all of it to find one answer. C4 diagrams were
missing.

## Decision

- **Root `README.md`**: a short start only. What the project is, quick start,
  addresses, commands and a map of the documentation.
- **`docs/README.md`**: an overview in the shape of
  [arc42](https://arc42.org), only the sections with content: goals, context,
  solution strategy, building blocks, deployment, cross-cutting concepts and
  decisions. C4 diagrams of levels 1 and 2 in Mermaid, so GitHub shows them.
- **Next to the code**: a topic of one app or library is in its `README.md`,
  for example migrations in `apps/api` and translations in `libs/web/i18n`.
- **`docs/concepts/`**: only mechanisms that span several libraries and can
  be drawn: authentication, API contracts, frontend.
- **`docs/development/`**: setup and conventions.
- Each kind of document answers one question: ADR why, `AGENTS.md` what is
  allowed, a concept or README how it works now. Facts live in one place;
  others link to it.

Rejected: Structurizr DSL, which keeps C4 levels consistent but needs its
own tool, because GitHub does not render it. Rejected: one folder for all
concepts, because a topic of one library is easier to keep current next to
its code.

## Consequences

- Mermaid lays out C4 diagrams on its own; short descriptions keep them
  readable. Check a changed diagram with mermaid-cli or on GitHub.
- A new library describes itself in its `README.md` and is linked from
  `docs/README.md`.
