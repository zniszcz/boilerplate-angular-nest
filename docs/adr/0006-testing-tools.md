# 0006. Vitest, supertest and Playwright with Gherkin

- Status: Accepted
- Date: 2026-10-01

## Context

The template needs unit, API and end-to-end tests with the most standard tools
for this stack. End-to-end tests must be written in business language, which
is also needed at work.

## Decision

- Vitest for unit tests on both sides.
- Vitest with supertest for backend API tests.
- Playwright with playwright-bdd for end-to-end tests. Scenarios are `.feature`
  files in English.

## Consequences

- One test runner on both sides.
