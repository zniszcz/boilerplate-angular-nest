---
name: todo-new
description: >
  Splits a finished spec into a task list where every task can be done on a
  cold start and names its test. Use after the spec has no open questions,
  or when the user asks to plan the work of a feature.
metadata:
  kind: step
---

# Plan the tasks

Carries out step 3 of [CONTRIBUTING.md](../../../CONTRIBUTING.md#3-plan-the-tasks-and-scan-the-impact).

1. Read `<name>.spec.md` in the root of the worktree. If **Open questions**
   is not empty, stop and use the `spec-write` skill first.
2. Write `<name>.todo.md` next to it, in the format of
   [the template](references/todo-template.md):
   - a `#` title and one to three sentences of context, naming the spec;
   - `- [ ]` tasks with imperative titles, subtasks one level deep at most;
   - under each task `What:` (what and why, complete on its own), `Read:`
     (files to read, one line each, with why), and for code `Test:`;
   - `Test:` is `<file>.spec.ts :: <test name>` or
     `apps/web-e2e/features/<file>.feature :: <scenario>`, a test that does
     not exist yet and that the task's code will make pass.
3. Order: the `.feature` scenarios first, then the domain, the API, the
   page. One task is one red-green cycle; split anything bigger.
4. Never write "as we agreed" or "see above": each task must make sense to
   an agent that saw nothing else.
5. Check the format with
   `node .agents/skills/todo-next/scripts/todo.mjs check <name>.todo.md`
   and act on the contract below.

## Contract

| status      | meaning                             | do next                                          |
| ----------- | ----------------------------------- | ------------------------------------------------ |
| `valid`     | the format is right                 | show the user the task titles and ask to start   |
| `invalid`   | `data.problems` lists what is wrong | fix each problem and check again                 |
| `not-found` | no such file                        | check the path; the file is in the worktree root |

Any other status, no JSON line, or a non-zero exit code: stop and show the
user the output.
