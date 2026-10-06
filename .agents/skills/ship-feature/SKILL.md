---
name: ship-feature
description: >
  Leads a business feature from an idea to a merged pull request, step by
  step, through the workflow of CONTRIBUTING.md, and picks up where the last
  session stopped. Use when the user wants to build a feature, says to go on
  with one, or asks where a feature stands.
disable-model-invocation: true
metadata:
  kind: aggregator
---

# Ship a feature

Carries out [CONTRIBUTING.md](../../../CONTRIBUTING.md) for one business
feature. That document is the source of truth: read the section of the
current step before doing it. This skill only knows the order and which
skill does each step. For a technical change that does not fit, say so and
offer to skip steps.

## Where are we

Run `node .agents/skills/ship-feature/scripts/stage.mjs [name]` in the
feature's worktree (or in the main checkout before one exists) and read only
the last line. Tell the user the stage in one sentence, then do it.

## Contract

| status           | meaning                                            | do next                                                                                                                                                                                                                      |
| ---------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start-instance` | no running instance for this branch                | step 1: `instance-up` skill; continue in `data.worktree` it returns                                                                                                                                                          |
| `write-spec`     | no spec, several (`data.specs`), or open questions | step 2: `spec-write` skill                                                                                                                                                                                                   |
| `plan-tasks`     | no valid task list                                 | step 3: `todo-new` skill, then step 4: `env-check` skill                                                                                                                                                                     |
| `build`          | `data.progress`, `data.nextTask`                   | step 5: `todo-next` skill, one task, then stop and let the user say to go on                                                                                                                                                 |
| `blocked`        | every open task is blocked; `data.blocked`         | show the reasons, ask the user                                                                                                                                                                                               |
| `verify`         | all tasks done, no pull request                    | steps 6–9 in order, one at a time with the user: `browser-demo`; the commands of [AGENTS.md](../../../AGENTS.md#before-a-commit); `impact-scan`; `env-check`; the docs table of CONTRIBUTING step 9. Then step 10: `pr-open` |
| `review`         | `data.pr` is open                                  | `pr-watch` skill                                                                                                                                                                                                             |
| `cleanup`        | `data.pr` is merged                                | steps 11–12: `instance-cleanup` skill                                                                                                                                                                                        |
| `closed`         | the pull request was closed without a merge        | ask the user what to do; remove nothing on your own                                                                                                                                                                          |

After each step, run the stage script again rather than guessing the next
one. Any other status, no JSON line, or a non-zero exit code: stop and show
the user the output.

## Rules

- One step at a time; say which step you are on and what comes next.
- Ask the user at every decision; recommend an option when you can.
- Commit and push only when the user says so, in Conventional Commits.
- Merge only on the user's word.
