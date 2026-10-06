---
name: env-check
description: >
  Lists the environment variables a branch adds or removes and flags
  secrets, so none is missing from .env.example or 1Password. Use after planning a
  feature, before opening a pull request, or when the user asks whether
  1Password and .env.example are up to date.
metadata:
  kind: step
---

# Check new variables and secrets

Carries out step 4 of
[CONTRIBUTING.md](../../../CONTRIBUTING.md#4-new-environment-variables-or-secrets).

From the root of the worktree run
`node .agents/skills/env-check/scripts/env.mjs` and read only the last line.

## Contract

| status       | meaning                                         | do next                                                                                                                                         |
| ------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-changes` | `.env.example` gains or loses no variable       | if the spec or the plan needs a new variable, it is missing from `.env.example`: add it with a comment and a safe local default                 |
| `changed`    | `data.added` (with `secret`) and `data.removed` | for each `secret: true`, ask the user to add it to 1Password for the cluster and wait for their yes; report removed ones as to delete there too |

You cannot see 1Password; never claim it is up to date, ask.

Any other status, no JSON line, or a non-zero exit code: stop and show the
user the output.
