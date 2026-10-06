# 0021. Tests by risk, mostly over the API on a real database

- Status: Accepted
- Date: 2026-10-06

## Context

Most code here is written by AI agents, and they write tests almost for
free. So the number of tests and line coverage say nothing: a test with no
assertion covers every line it runs. An agent that writes tests for code it
has just written also asserts what the code does, not what it should do, so
the test keeps the bug. [ADR 0006](0006-testing-tools.md) chose the tools;
this ADR decides what to test with them and how to tell the tests work.

## Decision

- **Shape: the testing trophy, not the pyramid.** Static checks first
  (TypeScript, ESLint, Nx boundaries, dependency-cruiser). Then:
  - most tests are **API tests**: the whole app over HTTP with supertest,
    against a real PostgreSQL in a container (Testcontainers),
  - **unit tests** only for logic with its own rules: domain aggregates and
    value objects, and frontend code with real behaviour, such as the
    interceptor that refreshes tokens,
  - **end-to-end tests** in `.feature` files only for the main user paths.
- **No unit tests** for controllers, Nest modules, mappers, getters,
  presentational components (Storybook shows them) or stores without logic.
  No snapshots, no tests that only check something was created.
- **The expected result comes from a requirement**, never from reading the
  implementation: a rule in a doc comment, a scenario, an example a person
  wrote. A new test must fail before the code that makes it pass.
- **Real PostgreSQL, never SQLite or pg-mem.** Migrations use
  PostgreSQL-only features, and the refresh race relies on its row locks;
  another engine would pass tests the production database fails.
- **Metrics that count:** mutation score of domain and application
  ([ADR 0022](0022-mutation-testing.md)), bugs found after release (issues
  with the `bug` label) and flaky tests. Line coverage is a hint where tests
  are missing, never a goal or a gate. Rejected as goals: coverage, number
  of tests, share of passing tests, because an agent games them at once.
- **Goals in ADRs, paths in skills, gates in CI.** Skills propose a way to
  work, such as TDD. CI checks the result whatever the way, so someone who
  works without the skills meets the same gates:
  - a pull request that closes a `bug` issue must change a test,
  - a flaky test fails the run, like any failing test,
  - mutation score under the threshold blocks the merge.

## Consequences

- API tests need Docker. They run in about 4 seconds; one container serves
  the whole run. How they work: [Testing](../concepts/testing.md).
- Fewer tests, each tied to a rule. A review reads the scenario and the
  assertions, not the count.
- Order of TDD cannot be checked by CI, only its effects; mutation testing is
  the effect that shows a test that checks nothing.
