# Testing

How the tests run: backend tests against a real database, frontend logic in
Angular's test environment. What to test and why:
[ADR 0021](../adr/0021-testing-strategy.md); mutation testing:
[ADR 0022](../adr/0022-mutation-testing.md).

| Where                         | What                                                                                               | Config                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `libs/api/*/src/**/*.spec.ts` | unit tests of domain rules, no Nest and no database                                                | `vitest.config.mts` per lib                                           |
| `libs/web/*/src/**/*.spec.ts` | unit tests of frontend logic, such as the refresh interceptor, in jsdom with TestBed; no templates | `vitest.config.mts` per lib, setup in `tools/vitest/angular-setup.ts` |
| `apps/api/test/*.spec.ts`     | API tests: the whole app over HTTP on PostgreSQL                                                   | `apps/api/vitest.config.mts`                                          |
| root                          | all backend tests at once, for Stryker only                                                        | `vitest.mutation.config.mts`                                          |

`pnpm test` runs every project's tests through Nx; `pnpm mutate` runs
Stryker.

## One container, a database per test file

```mermaid
sequenceDiagram
    participant V as Vitest
    participant G as global-setup.ts
    participant PG as PostgreSQL container
    participant F as each test file
    V->>G: once per run
    G->>PG: start postgres:18.6, data in memory, fsync off
    G->>PG: run migrations into template_app
    V->>F: in parallel
    F->>PG: CREATE DATABASE test_x TEMPLATE template_app
    F->>F: startApi(): AppModule + configureApp, seed the admin
    F->>PG: DROP DATABASE test_x after the file
```

- Copying the template takes milliseconds, so files run in parallel and never
  see each other's data. Tests inside one file share their database.
- `configureApp` is the same function `main.ts` uses, so tests get the same
  pipes, envelope and cookies as clients do.
- Each `browser()` in `test/api.ts` has its own cookies and its own
  `CF-Connecting-IP`, so the login rate limit of one test never blocks
  another.
- Webpack's `require.context` does not exist in Vitest; `test/migrations.ts`
  finds the same migration files with `import.meta.glob`.
- Nest needs decorator metadata, so the API tests compile with SWC.

## Races

Two requests that should collide rarely do on a fast machine. The refresh
race test holds a row lock on the tokens, waits in `pg_stat_activity` until
both requests wait for it, and then releases it. The race then happens every
time, not by luck.

## End-to-end scenarios

```mermaid
sequenceDiagram
    participant P as Playwright
    participant S as serve.mjs
    participant PG as PostgreSQL container
    participant A as built API :3100
    participant W as built web :4300
    P->>S: webServer, once per run
    S->>PG: start, migrate, seed the admin
    S->>A: node dist/apps/api/main.js
    S->>W: static files, /api proxied to the API
    P->>W: each scenario in its own browser, in parallel
```

- `bddgen` turns `features/*.feature` into Playwright tests in
  `.features-gen/`, which is not committed.
- `steps/fixtures.ts` gives every scenario its own users (`accounts`), its
  own client address and an admin API client to set up what a scenario
  takes as given.
- Reports go to `reports/e2e`, traces of failed retries to `tmp/e2e-results`.
