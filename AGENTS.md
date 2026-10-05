# Agent rules

Rules for the whole repository. Deeper `AGENTS.md` files add rules for their
directory. Why each decision was made: [docs/adr](docs/adr/README.md). How to
run and change things: [README](README.md).

## Language and commits

- Everything in the repository is in English: code, comments, docs, commit
  messages.
- Commit messages follow Conventional Commits. Push right after each commit.

## Before a commit

Run and fix: `pnpm lint`, `pnpm build`, `pnpm format:check`, and
`pnpm contracts:check` after any change to a DTO or a route.

## Versions

- Exact versions only, never `^` or `~`. Install from the repository root;
  projects have no `package.json` of their own. See
  [ADR 0004](docs/adr/0004-exact-versions.md).
- Do not upgrade TypeScript to 7 or NestJS to 12. See
  [ADR 0003](docs/adr/0003-node-and-typescript-versions.md).

## Where code goes

- Apps only wire things together. Logic lives in libraries. See
  [Where code goes](README.md#where-code-goes) and
  [ADR 0005](docs/adr/0005-nx-monorepo-layout.md).

## API contract

Every response the frontend sees, apart from files, has an envelope with a
`code` from one catalog, and the HTTP status matches the code. Consistency
matters more than performance. See
[ADR 0012](docs/adr/0012-response-envelope.md).

## Decisions

- When a design or architectural decision is made during a conversation,
  suggest writing an ADR for it and updating the `AGENTS.md` files it affects.
  Suggest it, do not do it without approval.
- A new architectural decision gets an ADR in `docs/adr`, from
  [template.md](docs/adr/template.md). Never edit an accepted ADR; supersede
  it with a new one.
- A rule that follows from a decision goes to the deepest `AGENTS.md` it
  applies to as a whole, and links to the ADR instead of repeating it.
- A new `AGENTS.md` needs a `CLAUDE.md` next to it containing `@AGENTS.md`.
