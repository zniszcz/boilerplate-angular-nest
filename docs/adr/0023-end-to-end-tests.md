# 0023. End-to-end scenarios in Gherkin on the built apps

- Status: Accepted
- Date: 2026-10-06

## Context

[ADR 0006](0006-testing-tools.md) chose Playwright with playwright-bdd and
English `.feature` files. [ADR 0021](0021-testing-strategy.md) keeps end-to-end
tests to the main user paths. This ADR decides how they run.

## Decision

- **`apps/web-e2e`**, a project of its own with the new tag `type:e2e`. It
  drives the app from outside like a user and imports only `type:contracts`.
- **Scenarios first.** A feature starts as a `.feature` file a person reads
  and accepts; steps in `steps/` make it run. A scenario describes behaviour
  in the words of the business ("I add the user"), never clicks or
  selectors. Two to five scenarios per feature; edge cases go to API tests.
- **On the built apps**, not the dev servers: `serve.mjs` starts PostgreSQL
  in a container, runs migrations and the seed, starts the built API on
  port 3100 and serves the built web app on 4300 with `/api` proxied, as
  nginx does. The ports do not clash with `pnpm dev`.
- **On a phone first**: the one Playwright project is a Pixel 7.
- **Scenarios run in parallel on one database**: each one makes its own
  users with unique emails and its own `CF-Connecting-IP`, so neither data
  nor the login limit spans scenarios.
- **Elements by role and visible text**, a test id only for what has
  neither, such as the generated password.
- **Flaky fails**: in CI one retry tells flaky from broken, and
  `failOnFlakyTests` fails the run either way. `eslint-plugin-playwright`
  forbids fixed waits.
- **CI runs them** in every run; locally `pnpm e2e`, not in a git hook,
  because they build both apps first.

Rejected: running against `pnpm dev`, because a run would depend on what the
developer has started and on its database. Rejected: Cucumber.js, because
playwright-bdd keeps Playwright's runner, parallelism and trace viewer.

## Consequences

- `pnpm e2e` needs Docker and Chromium (`pnpm exec playwright install
chromium`).
- The emails in scenarios are names, such as "anna"; steps turn them into
  unique addresses.
