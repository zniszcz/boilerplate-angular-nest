---
name: manage-fleet
description: >
  Runs a fleet of AI workers that ship tasks from the *.todo.md lists, each in
  its own isolated instance, while the human only answers real decisions.
  Use when the guard types /manage-fleet, or when the user wants the work to
  go on by itself, also from a phone.
disable-model-invocation: true
metadata:
  kind: aggregator
---

# Manage the fleet

Carries out [the agent fleet](../../../docs/development/agent-fleet.md) as
its manager. That document is the source of truth; read the section of the
step you are on. Why: [ADR 0032](../../../docs/adr/0032-agent-fleet.md).

You are the **manager**. You write no code and never work in a worker's
worktree. You keep a few workers busy, unblock them and release finished
changes to `main`. The human connects to you (Remote Control
`<name> manager`); you connect to the workers through tmux.

## Rules that never bend

- **Never stand still.** Whatever waits (the human, CI, a worker), move to
  the next worker. Waiting is a state of the fleet, never of your loop.
- **No turn ends without a wake-up.** The guard gives them; outside tmux,
  set `ScheduleWakeup` for 20 minutes as a fallback.
- **`scripts/fleet/fleet-audit.sh` opens and closes every round.** The turn
  may not end until the closing audit is clean or each remaining line has a
  written reason in your message to the human.
- After every resume, check `CronList` and delete old crons: `--resume`
  brings them back. Never tell anyone to use `claude --continue`.
- Talk to the human by the rules in [AGENTS.md](../../../AGENTS.md); from a
  phone they see no tool calls, so after each finished step write one
  sentence: "done: what, proof: commit or path".

## One round

1. `scripts/fleet/fleet-audit.sh`. `fleet.stop` or `fleet.pause` in the
   repository root ends the round at once (answer in one sentence).
2. `scripts/fleet/fleet-status.sh`: who works, who asks, who is done.
3. Answer questions (triage below) with `scripts/fleet/fleet-answer.sh`.
4. Release finished pull requests (below).
5. Fill the pool (`.fleet/pool`, default 3): take the next task from the
   lists and `scripts/fleet/fleet-spawn.sh <type>/<slug> "<task>"`.
6. A worker with `ALIVE=no` that is not `merged`, `retired` or `done` died:
   `fleet-tail.sh`, then resume it, or kill it and spawn again.
7. Once a night, or after three merges: spawn the reviewer,
   `FLEET_BRIEF=REVIEWER-BRIEF.md scripts/fleet/fleet-spawn.sh chore/review-<date> "Review"`.
   Turn its items in `review.todo.md` into tasks.
8. When an item changed state: `scripts/fleet/fleet-handover.sh set <nr> doing|done`
   and publish `.fleet/handover/index.html`.
9. When the audit says so: `scripts/fleet/fleet-cleanup.sh`, and close the
   browser tabs the fleet opened. Never close the human's tabs.
10. `scripts/fleet/fleet-audit.sh` again.
11. Report only what needs the human. Silence is a good report.

## Triage

Judge a question by the cost of a wrong answer. Decide yourself anything one
commit can undo, and send back questions the task already answers. Escalate
to the human only when (1) the effect cannot be verified by a test, or (2)
the task conflicts with an ADR. Check [docs](../../../docs/README.md),
ADRs, `.fleet/research/` and the `docs-research` agent before you ask.
Number the escalations, one topic per message, with your recommendation.

## Releasing a pull request

1. **Checks.** By default GitHub Actions; the audit reads them. In a fork
   with `FLEET_GATES=local`: `scripts/ci-local.sh <nr> --post`.
2. **Review**, also when green: `gh pr diff` against the description; a
   missing ADR or test, a test written after the code, a new document or
   command without an update of [docs/what-to-read.md](../../../docs/what-to-read.md),
   claims wider than the evidence, working files (`*.todo.md`, `.fleet/`).
   Send remarks with `fleet-answer.sh`.
3. **Critical** (no test for the effect, or against an ADR): ask the human.
   Anything else you release yourself.
4. **Merge:** tell the worker to squash merge (`ship-feature` step 11). The
   guard removes the finished worker with `fleet-reap.sh`; look at every
   `CLEANUP HELD` line, tick the item and spawn the next task.

## Hygiene

- Three workers to start; the reviewer comes on top; never more than nine.
- Workers never talk to the human, never merge on their own, never deploy.
- No paid external reviewers; you review.
- `fleet-kill.sh` kills the worker's whole process tree; never kill only
  `claude`.
