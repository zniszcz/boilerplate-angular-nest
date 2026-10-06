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

1. Use the branch the user or the task names; any name works, existing or
   new. Only when you have to pick a name for a new branch yourself,
   propose one as
   [CONTRIBUTING.md](../../../CONTRIBUTING.md#1-start-an-isolated-instance)
   suggests and let the user confirm it.
2. From the repository root of the main checkout, run
   `pnpm --silent instance up <branch>`.
3. Read only the last line of the output, a JSON object, and act on
   `status` below. Do not open the log unless the contract says so.
4. Work on the branch inside `data.worktree` from now on.

## Contract

| status          | meaning                                                                          | do next                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`         | the apps answer; `data` has the addresses                                        | tell the user each address in `data.apps` and `data.worktree`; mention `data.movedFromSlots` and `data.sweep.removed` if not empty     |
| `limit-reached` | `data.limit` instances exist already; `data.instances` lists them                | show the list and ask which to remove; then the user removes one, with the `instance-cleanup` skill or by hand, and you run this again |
| `start-failed`  | an app exited; `data.logs` has its output                                        | read the last 30 lines of that app's log, explain the cause to the user, do not change code to fix it unasked                          |
| `start-timeout` | the apps did not start listening in time                                         | same as `start-failed`                                                                                                                 |
| `no-free-ports` | every free block has a taken port                                                | show `data.skipped` and ask the user what holds the ports (`ss -ltnp`)                                                                 |
| `bad-config`    | `INSTANCE_APPS` is empty or an app has no port in `.env.example`; `data.missing` | show the user; fixing the config is their decision ([how](../../../docs/development/adding-an-app.md#4-ports))                         |

Any other status, no JSON line, or a non-zero exit code: stop, show the user
the `log` path or the error line, and do not try to fix it.
