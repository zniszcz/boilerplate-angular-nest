# 0022. Mutation testing of domain and application with Stryker

- Status: Accepted
- Date: 2026-10-06

## Context

[ADR 0021](0021-testing-strategy.md) needs a measure that an agent cannot
game by writing more tests. Mutation testing changes the code on purpose,
for example `>` into `>=`, and checks that some test fails. A change no test
notices is a rule nobody checks.

## Decision

- **StrykerJS** with its Vitest runner, run by `pnpm mutate` from the
  repository root (`stryker.config.json`).
- **Scope: `domain` and `application` of backend libraries.** That is where
  the rules are. Infrastructure, controllers and the frontend are left out:
  their mutants are slow to test and say little.
- **Unit and API tests together** (`vitest.mutation.config.mts`), because
  most application code is checked over the API. One Vitest project, not
  `test.projects`, because Stryker does not see per-test coverage in
  projects.
- **Threshold 80%**: below it `pnpm mutate` fails. Survivors that change
  nothing visible, such as a different status string the controller never
  compares, are accepted, not chased to 100%.
- **Incremental mode**: results are kept in `reports/mutation/` and only
  mutants in changed code run again. Full run about 80 seconds, incremental
  about 7 seconds on a laptop. **Concurrency 3**, so the laptop stays usable.
- **Where it runs**: in CI on every run, and locally in the git `pre-push`
  hook, not `pre-commit`, so commits stay instant. CI restores the
  incremental results from the GitHub cache; a full run took over 6 minutes
  there. Incremental results trust earlier ones for unchanged code, and a
  change elsewhere, such as a migration, could leave one stale, so a
  **nightly full run** (`mutation-nightly.yml`, `--force`) checks every mutant
  again and saves fresh results.
- **Vitest 4, not 5.** The Stryker 10.0.0 runner matches no test on
  Vitest 5 and reports every mutant as survived (stryker-js#6210), and
  `@nx/vitest` 23.2.1 supports only Vitest 3 and 4. Move to Vitest 5 when
  both support it. A score near zero after an upgrade means this bug, not
  bad tests.

Rejected: mutation testing of the whole repository, because a run would take
many minutes for little signal. Rejected: a Grafana trend of the score for
now; it is planned once there are several forks.

## Consequences

- A test that runs code without checking it shows up in the HTML report
  (`reports/mutation/index.html`) with the exact change that survived.
- `pnpm mutate` needs Docker, like the API tests.
- Code no test reaches shows up too, which is often dead code to remove.
- The nightly run is scheduled by GitHub Actions alone, on GitHub's
  machines, from the workflow file on `main`; nothing on our servers starts
  it. How to keep it running: [Testing](../concepts/testing.md#mutation-testing-in-ci).
