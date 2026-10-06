---
name: instance-cleanup
description: >
  Removes isolated instances whose work is done: their apps, worktree,
  database, Valkey data and local branch. Use after a pull request is
  merged, when the user wants to free a slot, or to tidy up forgotten
  instances.
metadata:
  kind: step
---

# Remove isolated instances

Carries out steps 11–12 of [CONTRIBUTING.md](../../../CONTRIBUTING.md#1112-merge-and-clean-up).
How instances work: [setup](../../../docs/development/setup.md#instances).

- Without a branch named, run `pnpm --silent instance sweep`: it removes
  every instance whose pull request is merged.
- For one branch the user names, run `pnpm --silent instance down <branch>`.
- To only free resources and keep the instance, run
  `pnpm --silent instance stop <branch>` instead.

Run from the repository root of the main checkout, never from inside the
worktree being removed. Read only the last line, a JSON object.

## Contract

| status                             | meaning                                                                                                                     | do next                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `swept`                            | `data.removed` are gone; `data.closedUnmerged` closed without a merge; `data.keptDirty` merged but with uncommitted changes | report all three lists; for `closedUnmerged` and `keptDirty` ask the user, and remove one only on their word with `down` |
| `removed`                          | the instance is gone                                                                                                        | confirm to the user                                                                                                      |
| `dirty`                            | uncommitted changes, or commits no other branch or remote has                                                               | show the user, ask whether to commit and push or to discard; never discard on your own                                   |
| `stopped`                          | its apps are stopped; the worktree and data stay                                                                            | confirm; `instance up` starts it again                                                                                   |
| `not-found`                        | no instance for that branch                                                                                                 | run `pnpm --silent instance list` and show the user what exists                                                          |
| `gh-missing`, `gh-unauthenticated` | the GitHub CLI is not installed, or cannot reach GitHub as the user                                                         | tell the user `summary`: install it, or run `gh auth login`; then run again. Never treat it as "no pull request"         |

Any other status, no JSON line, or a non-zero exit code: stop, show the user
the `log` path or the error line, and do not try to fix it.
