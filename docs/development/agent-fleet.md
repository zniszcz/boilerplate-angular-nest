# Agent fleet

How a fleet of AI coding agents works on this repository: one Claude Code
session is the manager, a few sessions are workers, each in its own isolated
instance, a reviewer looks at the whole once a night, and a guard in tmux
wakes the manager. The human only answers the decisions that really need a
person, also from a phone, and learns from what the fleet delivered. This
document is the specification of that way of working and how it is set up
here. Why: [ADR 0032](../adr/0032-agent-fleet.md). The fleet is optional:
every rule it serves is also enforced by CI, so work done without it is
checked the same way.

## Start and resume

One command, from any terminal:

```sh
./resume-manager.sh
```

It starts the tmux session `<name>-manager` (the name is `FLEET_NAME` in
[`scripts/fleet/fleet.conf`](../../scripts/fleet/fleet.conf), by default the
repository folder) with two windows: `claude`, the manager's conversation
with Remote Control `<name> manager`, and `guard`. When the manager already
runs, it only attaches. The conversation is resumed **by its id**, saved in
`.fleet/manager-session`; without one, a new conversation starts with
`/manage-fleet` and its id is saved. Point at another conversation once with
`./resume-manager.sh <id>`.

**Never `claude --continue`.** It resumes the newest conversation in the
folder, which is usually a worker's, not the manager's.

The manager runs with `--dangerously-skip-permissions` and
`--remote-control`. Without the first, the fleet stops at the first `tmux`
or `gh` prompt while nobody is at the computer; the second cannot be added
to a running session. Safety comes from isolation (a worktree per worker),
from the limits in the worker brief and from the rule that irreversible
steps (merge, deploy) belong to the manager.

After every resume the manager deletes old crons (`CronList`), because
`--resume` brings them back.

## Roles

| Role       | Who                                                        | Does                                                                                      | Never                                             |
| ---------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Human      | the developer, often on a phone                            | answers escalations, adds work, reads [what to read](../what-to-read.md) and the handover | watches workers or runs checks                    |
| Manager    | one Claude Code session, skill `manage-fleet`              | hands out tasks, triages questions, reviews, decides merges, cleans up                    | writes code or enters a worker's folder           |
| Worker     | one session per task in tmux, skill `ship-feature` + brief | ships one task as a pull request from its own instance, reports in files                  | talks to the human, merges alone, deploys         |
| Reviewer   | a worker with the reviewer brief, skill `review-project`   | compares what was merged with ADRs, `AGENTS.md` and docs, lists remarks with sources      | fixes anything                                    |
| Guard      | `scripts/fleet/fleet-guard.sh` in the manager's session    | wakes the manager when it stands still or a worker needs it; removes finished workers     | types while the manager works or over unsent text |
| Researcher | the `docs-research` agent, read only                       | answers "how is this done here" with quotes and paths                                     | changes or runs anything                          |

## The guard

- Every 30 seconds it looks at the manager's screen and types
  `/manage-fleet` when the screen has not changed for a whole interval
  (`GUARD_MINUTES` in `scripts/fleet/guard.conf`, default 7, read anew each
  round) or when a worker reported an event.
- **Events** are a status change to `review`, `ready-to-merge`, `blocked`,
  `asking` or `done`, and every question. `fleet-report.sh` appends them to
  `.fleet/events`; the guard moves the queue aside and deletes it only after
  a successful wake-up, so an event survives a failed try and a restart.
- It types only when the screen stood still since its last look, the session
  is not mid-turn and the prompt holds no unsent text (a dimmed suggestion,
  queued messages and a prompt floating above empty rows are recognised).
  It checks the command stands in the prompt before Enter and is gone after
  it, retries with a growing pause, and enlarges a pane a tiny client shrank.
- Every tenth look it runs `fleet-reap.sh`.
- Stop: `touch ~/.<name>-guard-stop`, or Ctrl+C in its window.

## The manager's round

Rules: never stand still (waiting is a state of the fleet, not of the loop);
no turn ends without a wake-up; `fleet-audit.sh` opens and closes every
round, and the turn may not end until the audit is clean or each remaining
line has a written reason.

A round: audit, status, answer questions, release finished pull requests,
fill the pool, check for dead workers, the reviewer once a night, the
handover list, cleanup when the audit asks (at least every third round),
audit again, report only decisions plus one sentence "done: what, proof".

The **audit** lists what the manager forgot: stop and pause files,
unanswered questions, a worker with an unsent instruction (two screen reads
that must agree) and for how long, workers waiting more than 10 minutes,
dead workers, reports older than 45 minutes from an idle worker, a pull
request without checks, red or hanging checks, a green pull request not
merged, one behind `main` or in conflict, files outside the allowed scope,
branches and worktrees left after a merge, held cleanups, a guide older
than a merged document, ADR or command, a pool not full or exceeded, an
overdue cleanup and machine load.

## Triage

A question is judged by the cost of a wrong answer. The manager decides
anything one commit can undo, sends back questions the task already
answers, and escalates to the human **only two things**: an effect no test
can verify, and a conflict with an ADR. It checks the docs, the ADRs,
`.fleet/research/` and the `docs-research` agent first. Escalations are
numbered, one topic per message, with a recommendation, so the human can
answer with one word from a phone.

## Workers

- `scripts/fleet/fleet-spawn.sh <type>/<slug> "<task>"` glues the brief
  ([`WORKER-BRIEF.md`](../../.agents/skills/manage-fleet/WORKER-BRIEF.md))
  to the task, opens a window in the tmux session `<name>-fleet` and starts
  Claude Code with Remote Control `<name>-<worker>`. It refuses when the
  main checkout is not on `main` or the pool is full.
- The worker follows [CONTRIBUTING.md](../../CONTRIBUTING.md) through the
  `ship-feature` skill, starting with an
  [isolated instance](setup.md#instances): its own worktree, ports and
  database.
- It never talks to the human: where a question would come, it writes an
  assumption into the spec and the pull request. It asks only in the two
  cases of the triage, with its recommendation, and goes on with what does
  not depend on the answer.
- It reports in files: `fleet-report.sh --status --phase --note --pr --ask`.
  Statuses: `starting`, `working`, `asking`, `review`, `ready-to-merge`,
  `merged`, `blocked`, `done`. Only the worker stamps `reported`, so a
  message from the manager does not reset the silence clock.
- It never merges alone: after green checks and the manager's review it
  reports `ready-to-merge`, and squash merges on the manager's word.

## Checks and review

- **GitHub Actions** is the default here: the audit reads the checks of each
  pull request; no checks at all is not green, and a check running longer
  than `FLEET_CI_HANG_MINUTES` (default 30) hangs.
- **Local gates** for a private fork without free CI: set `FLEET_GATES=local`
  in `fleet.conf`; the manager runs `scripts/ci-local.sh <nr> --post`, which
  runs the same checks as CI in a throwaway worktree and ends its report with
  a marker `<!-- gates <sha> ok|fail -->` that the audit compares with the
  pull request's head. See [CI runners](ci-runners.md).
- The manager's review is required also when everything is green: the diff
  against the description, a missing ADR or test, a test written after the
  code, claims wider than the evidence, a guide not updated, working files.
  No paid external reviewers.
- A critical pull request (no test for its effect, or against an ADR) goes
  to the human; the manager releases any other.

## Task lists and the handover list

- Tasks live in `*.todo.md` files in the root of the main checkout, outside
  git. Each one makes sense on a cold start: an imperative title, what and
  why, the files to read, and a test that does not exist yet (format of the
  `todo-new` skill).
- An item ending with `{handover <group>.<order> <me|you|both> [doing]}`
  goes to the handover list: group 1 is the fleet's queue, 2 the human's and
  shared work, 3 the fleet's work that waits for the human, 0 done before the
  list. The order is a whole number of any length, sorted as a number (1.99
  before 1.100). A broken tag or a repeated number is a loud warning.
- `scripts/fleet/fleet-handover.sh render` writes `.fleet/handover/index.html`,
  which the manager publishes as a page; `set <nr> todo|doing|done` changes
  the line in its list, with a backup.

## Decisions and the guide for the human

- Every decision about structure, technology or a boundary is an ADR in the
  same pull request; an accepted ADR is never edited, a new one supersedes it.
- [docs/what-to-read.md](../what-to-read.md) is the guide for the human:
  how to start, what to read now, what waits for a decision, and a "Last
  review" line. A pull request that adds a document, an ADR, a command or a
  decision updates it. `scripts/fleet/fleet-guide-check.sh` compares only
  its age with new documents, ADRs, scripts and `package.json` commands
  merged after it; it is an audit line, not a gate, because the value of an
  entry is for a person to judge.

## Talking to the human

Short messages, one topic at a time, full sentences without shorthand; long
content goes to a file and the message gives its path. Every decision is the
human's. On a phone no tool calls are visible, so after each finished step
one sentence with its proof. Silence apart from decisions is a good report.

## Stop and pause

`fleet.stop` in the repository root ends the work: no new tasks or workers,
one-sentence answers; only the human deletes it. `fleet.pause` holds the
work until the time written in it; the manager deletes it after that time.
The audit lists both first. The guard does not read them and keeps waking
the manager; an answer without tool calls is then correct.

To shut the fleet down for real, tmux sessions and every process they
started, use the skill `shutdown-fleet` (`scripts/fleet/fleet-shutdown.sh`,
`--dry-run` first). It writes `.fleet/resume.md` with the conversation id of
the manager and of every worker and the commands to come back, and aborts
without killing anything when a conversation could not be resumed. Then a
detached process closes the `<name>-manager` and `<name>-fleet` sessions:
by default it lets running work (builds, tests, gates) finish on its own for
up to 30 minutes and kills nothing by force; with `--force` it kills whole
process trees at once. The report is `.fleet/shutdown-report.txt`. `./resume-manager.sh` brings the manager back;
it resumes the workers from `resume.md`
([ADR 0034](../adr/0034-fleet-shutdown.md)).

## Pool and machine load

- The pool (`.fleet/pool`, default 3) limits all unfinished workers, also
  those waiting for a decision or a review. The reviewer comes on top; nine
  is the hard ceiling. `fleet-spawn.sh` refuses a full pool; new tasks wait
  in the lists.
- The audit measures the one-minute load, GPU use (`nvidia-smi`, the busiest
  card) and available memory. Above the core count, 90% GPU or under 8 GB
  free, it recommends lowering the pool by one, never under two; it never
  kills working workers. An unknown measurement is not evidence. The limits
  are assumptions, not measurements.

## Cleanup

- Every 5 minutes `fleet-reap.sh` removes a worker that is `merged` or
  `done` with a merged pull request: its whole process tree (a browser
  started through MCP too), its instance (`FLEET_TEARDOWN_HOOK`), worktree
  and branch, and archives its record.
- A worktree stays when it has uncommitted work, an open pull request,
  unsent text, an unknown pull request state, or **commits after the merge
  that bring content `main` does not have**. Content is judged per file: the
  branch's version must be `main`'s current one or one `main` went through
  since the fork; files touched after the merged head count too, to catch an
  undo. Any git error keeps the worktree.
- `fleet-cleanup.sh`, at least every third round, removes gate folders no
  running gate needs, worktrees of merged branches and retired records. It
  never touches Docker or browser tabs.

## What the current version fixed

The first version of this fleet ran on another project; these changes came
from what went wrong there:

| Area                  | First version                                           | Now                                                                                       |
| --------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Waking the manager    | only after the screen stood still                       | also on an event from a durable queue, including a new pull request (`review`)            |
| Removing a worker     | by hand, by the manager                                 | `fleet-reap.sh` every 5 minutes, with safety checks and held cases in the audit           |
| When a worktree stays | any commit after the merge kept it                      | only commits bringing content `main` does not have, with tests of real loss               |
| Pool                  | "five working", parked workers outside it               | a limit on all unfinished workers; spawn refuses a full pool; ceiling of nine             |
| Machine load          | not measured                                            | load, GPU and memory in every audit, with a recommendation to lower the pool              |
| Audit                 | CI, runners and Docker leftovers                        | also stop and pause, long waits, unsent text, a stale guide, scope, pool, overdue cleanup |
| Review                | a paid external reviewer, stopped after a surprise bill | the manager before every merge and a reviewer once a night, nothing paid                  |
| Guide for the human   | a status file written by hand                           | a guide in the repository, updated in pull requests and watched by the audit              |
| Research              | none                                                    | a read-only agent with quotes and a shared `.fleet/research/`                             |
| Screen reading        | missed a prompt above empty rows                        | skips empty rows, recognises dimmed suggestions, enlarges a tiny pane                     |
| Handover numbers      | two digits                                              | any length, sorted as numbers, one parser with tests                                      |
| Tests of the scripts  | none                                                    | `scripts/fleet/tests/`                                                                    |

## Files

| Path                                              | What                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `resume-manager.sh`                               | the only start and resume command                                           |
| `scripts/fleet/fleet.conf`                        | settings of this repository: name, branch, scope, checks, guide, hook       |
| `scripts/fleet/*.sh`                              | the fleet's scripts; each starts with its usage                             |
| `scripts/fleet/gates.sh`, `gates.list`            | local gates, the same checks as CI                                          |
| `scripts/fleet/tests/`                            | tests of the scripts: `python3 -m unittest discover -s scripts/fleet/tests` |
| `.agents/skills/manage-fleet/`                    | the manager's skill and the worker and reviewer briefs                      |
| `.agents/skills/review-project/`, `tmux-handoff/` | the reviewer's skill and handing a step to the human                        |
| `.claude/agents/docs-research.md`                 | the read-only research agent                                                |
| `.agents/skills/shutdown-fleet/`                  | shutting the fleet down with a resume file                                  |
| `.fleet/` (outside git)                           | worker records, events, log, handover page, research notes, `resume.md`     |

The fleet needs a Linux or macOS machine with `tmux`, `git`, `gh`, `python3`
(standard library only) and Claude Code.

## Adapting it in a fork

Change `scripts/fleet/fleet.conf` (name, main branch, scope, `github` or
`local` checks, guide, worker skill, teardown hook), `scripts/fleet/gates.list`
when the checks change, and the limits in the two briefs. Keep the start
command and the "never `--continue`" warning at the top of `AGENTS.md` and
in the README.
