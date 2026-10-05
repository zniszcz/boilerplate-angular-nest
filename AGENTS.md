# Agent rules

Rules for the whole repository. Deeper `AGENTS.md` files add rules for their
directory. Why each decision was made: [docs/adr](docs/adr/README.md). How the
system fits together, with links to every concept and README:
[docs/README.md](docs/README.md). Read only the document the task needs.

## Language and commits

- Everything in the repository is in English: code, comments, docs, commit
  messages.
- Commit messages follow Conventional Commits. Push right after each commit.

## Before a commit

Run and fix: `pnpm lint`, `pnpm build`, `pnpm architecture`, `pnpm versions`,
`pnpm format:check`, and
`pnpm contracts:check` after any change to a DTO or a route.

## Versions

- Exact versions only, never `^` or `~`. Install from the repository root;
  projects have no `package.json` of their own. See
  [ADR 0004](docs/adr/0004-exact-versions.md).
- Do not upgrade TypeScript to 7 or NestJS to 12. See
  [ADR 0003](docs/adr/0003-node-and-typescript-versions.md).

## Where code goes

- Apps only wire things together. Logic lives in libraries. See
  [Code](docs/README.md#code) and
  [ADR 0005](docs/adr/0005-nx-monorepo-layout.md).
- Every project has two Nx tags in `project.json`, one `scope:*` and one
  `type:*`. A new library needs both, or the boundary rules cannot check it.
  Which tag may import which is defined only in `depConstraints` in
  `eslint.config.mjs`.

  | Tag              | Meaning                                                           | Examples                                 |
  | ---------------- | ----------------------------------------------------------------- | ---------------------------------------- |
  | `scope:api`      | runs in the backend                                               | `apps/api`, `libs/api/*`                 |
  | `scope:web`      | runs in the browser                                               | `apps/web`, `libs/web/*`                 |
  | `scope:shared`   | used by both sides, plain TypeScript                              | `libs/shared/contracts`                  |
  | `type:app`       | an application that only wires libraries together                 | `apps/api`, `apps/web`, `apps/storybook` |
  | `type:domain`    | a backend bounded context in DDD layers, see `libs/api/AGENTS.md` | `users`, `authentication`                |
  | `type:platform`  | technical code shared by many libraries, no domain model          | `libs/api/access`, `responses`           |
  | `type:feature`   | frontend pages or containers that connect state to components     | `libs/web/auth`, `i18n`                  |
  | `type:ui`        | presentational components only                                    | `libs/web/ui`, `libs/web/helm`           |
  | `type:contracts` | types shared by the frontend and the backend                      | `libs/shared/contracts`                  |

  A library that fits no tag is a sign of a missing decision: ask, and
  record the new tag in an ADR.

- Boundaries between libraries go to Nx, layers inside a library and cycles
  to `.dependency-cruiser.cjs`, never the same rule in both. See
  [ADR 0015](docs/adr/0015-ddd-layers.md).

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
- How something works is described next to its code, in the `README.md` of
  that app or library. A mechanism that spans several libraries and can be
  drawn goes to `docs/concepts/`. The root `README.md` stays a short start;
  everything else is linked from `docs/README.md`.
- A new `AGENTS.md` needs a `CLAUDE.md` next to it containing `@AGENTS.md`.
