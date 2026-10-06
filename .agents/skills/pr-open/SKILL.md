---
name: pr-open
description: >
  Opens the pull request of a finished feature, with a title that follows
  Conventional Commits, a short why and what, the tasks that skipped test
  first, and the spec folded at the end. Use when the feature is verified
  and the user wants it reviewed.
metadata:
  kind: step
---

# Open the pull request

Carries out step 10 of
[CONTRIBUTING.md](../../../CONTRIBUTING.md#10-open-the-pull-request).

1. Make sure everything is committed and pushed.
2. Write the intro to `tmp/skills/pr-open/intro.md`: `## Why` (a few
   sentences), `## What` (a short list), `## Out of scope` from the spec.
   Write for a reviewer who has not seen the conversation.
3. Pick the title: `<type>: <what it does>`, the way the squash commit on
   the default branch should read.
4. Run
   `node .agents/skills/pr-open/scripts/pr.mjs <name> tmp/skills/pr-open/intro.md "<title>"`
   and read only the last line.
5. On `ready`: `gh pr create --title "<title>" --body-file <data.body>`. Add
   your agent's attribution line to the body first if your rules ask for
   one. Give the user the link.

## Contract

| status          | meaning                                   | do next                                          |
| --------------- | ----------------------------------------- | ------------------------------------------------ |
| `ready`         | `data.body` holds the full body           | open the pull request as in step 5               |
| `title-invalid` | `data.problems` say what breaks the rules | fix the title and run again                      |
| `spec-missing`  | no `<name>.spec.md`                       | check the name; the spec is in the worktree root |
| `intro-missing` | the intro file does not exist             | write it first                                   |

Any other status, no JSON line, or a non-zero exit code: stop and show the
user the output.
