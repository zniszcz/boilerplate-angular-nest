---
name: impact-scan
description: >
  Compares the projects a feature's plan named with those the change really
  touched, and checks the impact notes of each touched project. Use after
  the tasks of a feature are done, before opening the pull request, or when
  the user asks what a change affects.
metadata:
  kind: step
---

# Scan the impact of the change

Carries out step 8 of
[CONTRIBUTING.md](../../../CONTRIBUTING.md#8-scan-the-impact-again). The
first scan, while planning, is part of the `todo-new` skill.

From the root of the worktree run

```sh
node .agents/skills/impact-scan/scripts/impact.mjs <name>.todo.md
```

Read only the last line. `data.impact` holds the `## Impact` notes of every
touched project; check each note against the change and list what is
missing. `data.otherFiles` are changes outside projects, such as
`.env.example` or `compose.yaml`; check them against the root
[AGENTS.md](../../../AGENTS.md#documentation) table.

## Contract

| status       | meaning                                                                                 | do next                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `matches`    | the change touched exactly the planned projects                                         | check `data.impact` and `data.otherFiles`; report what is missing as new tasks                                 |
| `differs`    | `data.touchedUnplanned`, `data.plannedUntouched` or `data.unknownPlanned` are not empty | explain each to the user: a forgotten task, a plan that was wrong, or a typo in `Projects:`; then as `matches` |
| `no-plan`    | the task list has no `Projects:` line                                                   | ask the user which projects were planned, add the line, run again                                              |
| `no-changes` | nothing changed since the base                                                          | tell the user; there is nothing to scan                                                                        |
| `not-found`  | no such task list                                                                       | look for `*.todo.md` in the worktree root                                                                      |

`data.alsoAffected` are projects that depend on the touched ones; their
tests run in CI, they need no task unless an impact note says so.

Any other status, no JSON line, or a non-zero exit code: stop and show the
user the output.
