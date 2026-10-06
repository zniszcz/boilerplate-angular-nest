# Agent rules

Rules for the whole repository. Deeper `AGENTS.md` files add rules for their
directory. Why each decision was made: [docs/adr](docs/adr/README.md). How the
system fits together, with links to every concept and README:
[docs/README.md](docs/README.md). Read only the document the task needs.

## Language and commits

- Everything in the repository is in English: code, comments, docs, commit
  messages.
- Commit messages follow Conventional Commits. Push right after each commit.
- Pull requests are squash merged, so the pull request title follows
  Conventional Commits too: it becomes the commit on `main`. See
  [ADR 0027](docs/adr/0027-squash-merges.md).

## Before a commit

Run and fix: `pnpm lint`, `pnpm build`, `pnpm architecture`, `pnpm versions`,
`pnpm format:check`, `pnpm test`, and
`pnpm contracts:check` after any change to a DTO or a route.
Before a push, also `pnpm mutate` (the `pre-push` hook runs it).

## Tests

Why: [ADR 0021](docs/adr/0021-testing-strategy.md). How they run:
[Testing](docs/concepts/testing.md).

- Write the test first, from the requirement, and see it fail. Never derive
  the expected value from the implementation. A new user-facing feature
  starts as a `.feature` file in `apps/web-e2e/features`. See
  [ADR 0023](docs/adr/0023-end-to-end-tests.md).
- Test behaviour over the API with a real database. Unit tests only for
  domain rules and frontend logic. No tests for controllers, modules,
  getters, presentational components, no snapshots.
- Never mock the database or replace PostgreSQL with another engine.
- A bug fix starts with a test that reproduces the bug and fails. Then fix
  the code. CI blocks a pull request that closes a `bug` issue without
  changing any test.
- A flaky test is a failing test. Fix the cause, never add waits or retries.
- Never weaken or delete an assertion to make a test pass.
- A surviving mutant in `pnpm mutate` means a missing test or dead code.
  Add the test or remove the code; do not lower the threshold.
  See [ADR 0022](docs/adr/0022-mutation-testing.md).

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
  | `type:e2e`       | end-to-end tests that drive the app from outside                  | `apps/web-e2e`                           |

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

## Documentation

- Lists in `docs/README.md` and `docs/adr/README.md` between
  `<!-- generated:… -->` markers come from `pnpm docs:generate`; never edit
  them by hand. The pre-commit hook regenerates them and CI checks them with
  `pnpm docs:check`.
- The first sentence of an app's or library's `README.md` is its description
  in the project list, so keep it a true, specific summary.
- After a change, check whether it changes what `docs/README.md` describes,
  and update it in the same commit:

  | Change                                                                  | Update in `docs/README.md`         |
  | ----------------------------------------------------------------------- | ---------------------------------- |
  | a new app in `apps/`, or a new service in `compose.yaml` or the cluster | container diagram (5)              |
  | code starts or stops using a service, such as a first Redis client      | container diagram (5)              |
  | a new external system, such as SMTP, S3 or an identity provider         | context diagram (3)                |
  | a change to CI, images, health checks or how the app is deployed        | deployment (7)                     |
  | a new major choice, such as a framework or a pattern                    | solution strategy (4), with an ADR |

  Each diagram node also says in a `%%` comment when it must change.

## Workflow and skills

- A business feature follows [CONTRIBUTING.md](CONTRIBUTING.md). See
  [ADR 0029](docs/adr/0029-feature-workflow.md).
- Agent skills live in `.agents/skills/` and follow the documentation, never
  the other way round. When a skill and a document disagree, fix the skill.
  How to add one: [.agents/skills](.agents/skills/README.md). Why:
  [ADR 0028](docs/adr/0028-agent-skills.md).

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
