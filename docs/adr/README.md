# Architecture decision records

Each file records one decision: why we made it and what we rejected.
Rules that follow from the decisions live in the `AGENTS.md` files next to the
code.

- Copy [template.md](template.md) to `NNNN-short-title.md` with the next
  number.
- Never edit an accepted record, apart from its status. To change a decision,
  write a new record and mark the old one `Superseded by`.
- A fork of this template keeps these records and continues the numbering.

Generated from the files here by `pnpm docs:generate`.

<!-- generated:adrs -->

| Nr                                                  | Decision                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| [0001](0001-record-decisions.md)                    | Record decisions in ADRs and rules in AGENTS.md                     |
| [0002](0002-angular-frontend.md)                    | Angular for the frontend                                            |
| [0003](0003-node-and-typescript-versions.md)        | Node.js 24 and TypeScript 6                                         |
| [0004](0004-exact-versions.md)                      | Exact versions of everything                                        |
| [0005](0005-nx-monorepo-layout.md)                  | Nx monorepo with logic in libraries                                 |
| [0006](0006-testing-tools.md)                       | Vitest, supertest and Playwright with Gherkin                       |
| [0007](0007-linters.md)                             | Default lint rule sets and module boundaries                        |
| [0008](0008-local-development.md)                   | Docker Compose watch for local development                          |
| [0009](0009-media-on-volume.md)                     | Media files on a volume, S3 later                                   |
| [0010](0010-cookie-authentication.md)               | JWT in httpOnly cookies with refresh rotation                       |
| [0011](0011-login-rate-limit.md)                    | Rate limit for login and refresh                                    |
| [0012](0012-response-envelope.md)                   | Response envelope with codes from one catalog                       |
| [0013](0013-own-field-codes-and-no-backend-i18n.md) | Own field codes, and no backend translations for now                |
| [0014](0014-strict-content-security-policy.md)      | Strict Content Security Policy and helmet                           |
| [0015](0015-ddd-layers.md)                          | Strict DDD layers, checked by Nx and dependency-cruiser             |
| [0016](0016-scheduled-jobs-as-commands.md)          | Scheduled jobs are commands, the schedule belongs to the deployment |
| [0017](0017-spartan-and-storybook.md)               | spartan/ui atoms and Storybook as an app                            |
| [0018](0018-loading-states-and-motion.md)           | Loading states and motion as a system                               |
| [0019](0019-ci-pipeline.md)                         | CI checks everything, builds only changed images                    |
| [0020](0020-documentation-layout.md)                | Documentation in the shape of arc42, next to the code               |
| [0021](0021-testing-strategy.md)                    | Tests by risk, mostly over the API on a real database               |
| [0022](0022-mutation-testing.md)                    | Mutation testing of domain and application with Stryker             |
| [0023](0023-end-to-end-tests.md)                    | End-to-end scenarios in Gherkin on the built apps                   |
| [0024](0024-ci-on-every-branch.md)                  | CI on every push to any branch, trunk-based                         |
| [0025](0025-ci-jobs-and-caches.md)                  | CI in five parallel jobs with caches and a summary                  |
| [0026](0026-image-retention.md)                     | Keep the 10 newest images and every image tagged prod               |

<!-- /generated:adrs -->
