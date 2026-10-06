---
name: instance-up
description: >
  Runs a branch as an isolated instance of the apps, with its own worktree,
  ports and database, and reports where it runs. Use at the start of work on
  a feature, when the user wants a branch running locally, or to start a
  stopped instance again.
metadata:
  kind: step
---

# Run a branch as an isolated instance

Carries out step 1 of [CONTRIBUTING.md](../../../CONTRIBUTING.md#1-start-an-isolated-instance).
How instances work: [setup](../../../docs/development/setup.md#instances).

1. Get the branch name from the user or the task. A new feature branch
   follows `feat/<short-name>`; ask if unsure.
2. From the repository root of the main checkout, run
   `pnpm --silent instance up <branch>`.
3. Read only the last line of the output, a JSON object, and act on
   `status` below. Do not open the log unless the contract says so.
4. Work on the branch inside `data.worktree` from now on.

## Contract

| status          | meaning                                                    | do next                                                                                                                       |
| --------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `ready`         | the apps answer; `data` has the addresses                  | tell the user `data.web`, `data.api` and `data.worktree`; mention `data.movedFromSlots` and `data.sweep.removed` if not empty |
| `limit-reached` | three instances exist already; `data.instances` lists them | show the list and ask which to remove; then use the `instance-cleanup` skill and run this again                               |
| `start-failed`  | an app exited; `data.logs` has its output                  | read the last 30 lines of that app's log, explain the cause to the user, do not change code to fix it unasked                 |
| `start-timeout` | the apps did not answer in 3 minutes                       | same as `start-failed`                                                                                                        |
| `no-free-ports` | every free block has a taken port                          | show `data.skipped` and ask the user what holds the ports (`ss -ltnp`)                                                        |

Any other status, no JSON line, or a non-zero exit code: stop, show the user
the `log` path or the error line, and do not try to fix it.
