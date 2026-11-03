---
name: shutdown-fleet
description: >
  Shuts the agent fleet down so it can come back: first writes a resume file
  with the conversation id of the manager and of every live worker (branch,
  worktree, uncommitted changes, the exact command to come back), then closes
  the fleet's tmux sessions: by default gently (Claude and the guard get
  SIGTERM, running builds, tests and gates finish on their own, then the
  sessions and idle daemons go), with --force killing whole process trees at
  once; finally it checks that nothing is left running. Use when the human says "shut the fleet down",
  "kill the sessions", "stop tmux for today" or "make sure nothing runs in
  the background".
metadata:
  kind: step
---

# Shut the fleet down, resumable

All the work is in `scripts/fleet/fleet-shutdown.sh`. Never kill the sessions
by hand (`tmux kill-session`, `kill`): that saves no conversation ids and
leaves behind daemons that left the process tree. Decision:
[ADR 0034](../../../docs/adr/0034-fleet-shutdown.md).

## Steps

1. **Plan, no effects.** `scripts/fleet/fleet-shutdown.sh --dry-run` prints
   the conversation ids, the commands to come back and the processes it
   would kill. It writes and kills nothing.
2. **Abort instead of guessing.** When the script ends with `ABORTED`, a
   Claude process has no `~/.claude/sessions/<pid>.json` or no `<id>.jsonl`
   transcript, so it could not be resumed. Nothing was killed. Pass the list
   from the message to the human and wait for their decision; do not work
   around it.
3. **Shut down.** `scripts/fleet/fleet-shutdown.sh` (gently), or
   `scripts/fleet/fleet-shutdown.sh --force` (at once; only when the human
   asks for `--force` or a gentle run left processes behind). It writes the resume file
   `.fleet/resume.md` (a copy stays in `.fleet/shutdown/`), puts the running
   manager id into `.fleet/manager-session`, and hands the killing to a
   detached process (`setsid`) that starts after 5 seconds
   (`FLEET_SHUTDOWN_DELAY`). That is why it works from inside the manager's
   own session, which is about to disappear.
4. **Before the session goes** (when you are the manager in tmux): within
   those seconds, tell the human in one sentence where the resume file is and
   that `./resume-manager.sh` brings the fleet back. Wait for nothing else.
5. **Check** (when you run outside the fleet's sessions): read
   `.fleet/shutdown-report.txt`; in the gentle mode it appears only once the
   work has finished or the wait ran out. A last line `result: ok` means both
   sessions are gone and no remembered process is alive. `result: WAITING`
   means something still works after the wait; it was not killed, its
   sessions stay, and the report lists it (`STILL RUNNING`).
   `result: FAILED` lists every process and session that survived. Pass it
   on word for word; run `--force` only on the human's word.

## What it stops, and how

Everything that grew out of the panes of the `<name>-manager` and
`<name>-fleet` sessions, plus processes that left the tree (a build daemon,
a watcher, a background job) but still carry one of those panes in
`TMUX_PANE`. Sessions with other names are never touched, including those
whose name only starts the same way.

- **Default, gentle.** Panes stay open (`remain-on-exit`), Claude and the
  guard get SIGTERM, and the rest of the work (builds, tests, gates,
  detached jobs) finishes on its own for up to `FLEET_SHUTDOWN_WAIT` seconds
  (1800 by default). Idle daemons (`FLEET_SHUTDOWN_IDLE`: Gradle and Kotlin
  daemons, watchers, dev servers) are not work: they get SIGTERM only after
  the sessions close. Nothing gets SIGKILL; what still runs after the wait
  stays and goes into the report.
- **`--force`.** SIGTERM to everything at once and `tmux kill-session`, after
  5 seconds (`FLEET_SHUTDOWN_GRACE`) SIGKILL for survivors.

Both modes finally check every remembered PID together with its start time,
so a reused PID is never hit. Isolated
instances (databases, Docker) are not stopped; `instance-cleanup` does that.

## Coming back

The human runs `./resume-manager.sh`. After resuming, the manager reads
`.fleet/resume.md` and resumes every worker with the command listed there,
each in the window `<name>-fleet:<worker>`, so the guard and the audit see it.

## Tests

`python3 -m unittest discover -s scripts/fleet/tests`
(`test_fleet_shutdown.py`). The tests cover both modes and run dummy sessions on a separate tmux
server (their own `TMUX_TMPDIR`, no `TMUX`), so they cannot reach a real
fleet. Never try the script on real sessions: use `--dry-run` for that.
