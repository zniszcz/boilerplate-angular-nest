---
name: tdd-check
description: >
  Runs one test and reports whether it is red or green, to prove a test
  fails before the code and passes after it. Use before writing the code of
  a task and again after, or whenever the user asks whether a test passes.
metadata:
  kind: step
---

# Check one test, red or green

Carries out the test runs of step 5 of
[CONTRIBUTING.md](../../../CONTRIBUTING.md#5-one-task-at-a-time-test-first).

From the root of the worktree run

```sh
node .agents/skills/tdd-check/scripts/check.mjs red|green '<test>'
```

`red` before the code, `green` after. `<test>` is the task's `Test:` value:
`<file>.spec.ts`, `<file>.spec.ts :: <test name>` or
`apps/web-e2e/features/<file>.feature :: <scenario>`. Names match as a
substring. A `.feature` run builds both apps and takes a minute or more.
Read only the last line of the output.

## Contract

| status             | meaning                                                                                               | do next                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `red`              | before the code: the test fails, or cannot run yet (`data.broken`), for example steps not defined yet | good; write the code                                                                              |
| `passes-too-early` | before the code: it already passes, so it tests nothing new                                           | fix the test so it checks the requirement; never write code first                                 |
| `green`            | after the code: every matched test passes                                                             | good; refactor if needed, then check green again                                                  |
| `still-red`        | after the code: `data.failures` lists up to three                                                     | fix the code, not the test; never weaken an assertion                                             |
| `no-test-found`    | nothing matched the file and name                                                                     | fix the name in the task's `Test:`, or write the test                                             |
| `bad-input`        | the file does not exist, or is not `.spec.ts` or `.feature`                                           | fix the `Test:` value                                                                             |
| `no-json-report`   | the project's `playwright.config.ts` writes no JSON report                                            | tell the user; adding a `json` reporter there is their decision, never change the config yourself |

Any other status, no JSON line, or a non-zero exit code: stop, show the user
the `log` path, and do not try to fix it.
