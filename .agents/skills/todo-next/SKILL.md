---
name: todo-next
description: >
  Does exactly one task of a feature's task list, test first, and records
  the result in the list. Use when the user says to continue, to do the
  next task, or to go on with a feature that has a .todo.md file.
disable-model-invocation: true
metadata:
  kind: aggregator
---

# Do the next task

Carries out step 5 of
[CONTRIBUTING.md](../../../CONTRIBUTING.md#5-one-task-at-a-time-test-first),
one task per run, then stops. The rules for tests are in
[AGENTS.md](../../../AGENTS.md#tests).

`todo` below means
`node .agents/skills/todo-next/scripts/todo.mjs`, run from the root of the
worktree. Read only the last line of its output.

1. `todo next <name>.todo.md`. Use only `data`: the title, `what`, `read`,
   `test`. Do not open the whole list.
2. Read the files in `read`, and nothing else unless the task cannot be done
   without it.
3. If the task has a `test`:
   1. Write the test from `what` and the spec, never from the code.
   2. Use the `tdd-check` skill with `red`. On `red`, run
      `todo mark <file> <line> red`. On anything else, follow its contract.
   3. Write the least code that passes.
   4. Use `tdd-check` with `green`. On `green`, run
      `todo mark <file> <line> green`.
   5. Refactor if needed; check `green` again.
4. If the task has no `test`, do what `what` says.
5. `todo done <file> <line>`.
6. Report in a few lines: what changed, the progress, and the next task's
   title. Propose a commit message; commit only if the user says so.

Skip test first only when the user says so explicitly for this task:
`todo skip-tdd <file> <line> <their reason>`. Never on your own, not even
when a test is hard to write. When the task cannot go on, run
`todo block <file> <line> <reason>` and stop.

## Contract

| status                       | meaning                                               | do next                                                                      |
| ---------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `next`                       | `data` is the task to do                              | do it as above                                                               |
| `all-done`                   | every task is ticked                                  | tell the user; the next step is trying it in the browser                     |
| `all-blocked`                | every open task is blocked; `data.blocked` says why   | show the reasons and ask the user                                            |
| `marked`                     | the TDD result is recorded                            | go on                                                                        |
| `done`                       | ticked; `data.progress`, `data.parentDone`            | report                                                                       |
| `no-tdd-evidence`            | the task has a `Test:` without red and green recorded | run the missing `tdd-check`; never tick it another way                       |
| `blocked`                    | the block is recorded                                 | stop and tell the user why                                                   |
| `not-a-task`                 | the line is not a task, or a parent with subtasks     | run `todo next` again and use its line                                       |
| `invalid`, `valid`, `report` | answers of `check` and `report`                       | as the calling skill says                                                    |
| `not-found`                  | no such file                                          | look for `*.todo.md` in the worktree root; if none, use the `todo-new` skill |

Any other status, no JSON line, or a non-zero exit code: stop and show the
user the output.
