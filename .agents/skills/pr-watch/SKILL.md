---
name: pr-watch
description: >
  Watches an open pull request until its checks pass and nothing waits for
  an answer, fixing failures and answering reviews on the way. Use after
  opening a pull request, or when the user asks how a pull request is doing.
metadata:
  kind: step
---

# Watch the pull request

Carries out the second half of step 10 of
[CONTRIBUTING.md](../../../CONTRIBUTING.md#10-open-the-pull-request).

Run `node .agents/skills/pr-watch/scripts/watch.mjs [number]` and read only
the last line. Without a number it takes the current branch's pull request.
To wait for checks, run `gh pr checks <number> --watch` in the background
and look again when it ends; do not poll in a loop.

## Contract

| status              | meaning                                        | do next                                                                                                         |
| ------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `green`             | checks pass, no new comments                   | tell the user it is ready; merge only on their word                                                             |
| `pending`           | `data.pending` still run                       | wait as above, then look again                                                                                  |
| `failing`           | `data.failed` names the checks                 | read the failed job's log (`gh run view --log-failed`), fix the cause in a new commit, push; never skip a check |
| `changes-requested` | a reviewer asked for changes                   | treat `data.newComments` as tasks; fix, push, answer each comment                                               |
| `new-comments`      | `data.newComments` arrived since the last push | answer or fix each; ask the user when a comment needs their decision                                            |
| `merged`            | merged                                         | use the `instance-cleanup` skill                                                                                |
| `closed`            | closed without a merge                         | tell the user; remove nothing on your own                                                                       |
| `no-pr`             | the branch has no pull request                 | use the `pr-open` skill                                                                                         |

Any other status, no JSON line, or a non-zero exit code: stop and show the
user the output.
