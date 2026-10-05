# Architecture decision records

Each file records one decision: why we made it and what we rejected.
Rules that follow from the decisions live in the `AGENTS.md` files next to the
code.

- Copy [template.md](template.md) to `NNNN-short-title.md` with the next
  number.
- Never edit an accepted record, apart from its status. To change a decision,
  write a new record and mark the old one `Superseded by`.
- A fork of this template keeps these records and continues the numbering.

| Nr                                           | Decision                                        |
| -------------------------------------------- | ----------------------------------------------- |
| [0001](0001-record-decisions.md)             | Record decisions in ADRs and rules in AGENTS.md |
| [0002](0002-angular-frontend.md)             | Angular for the frontend                        |
| [0003](0003-node-and-typescript-versions.md) | Node.js 24 and TypeScript 6                     |
| [0004](0004-exact-versions.md)               | Exact versions of everything                    |
| [0005](0005-nx-monorepo-layout.md)           | Nx monorepo with logic in libraries             |
| [0006](0006-testing-tools.md)                | Vitest, supertest and Playwright with Gherkin   |
| [0007](0007-linters.md)                      | Default lint rule sets and module boundaries    |
| [0008](0008-local-development.md)            | Docker Compose watch for local development      |
| [0009](0009-media-on-volume.md)              | Media files on a volume, S3 later               |
| [0010](0010-cookie-authentication.md)        | JWT in httpOnly cookies with refresh rotation   |
| [0011](0011-login-rate-limit.md)             | Rate limit for login and refresh                |
| [0012](0012-response-envelope.md)            | Response envelope with codes from one catalog   |
