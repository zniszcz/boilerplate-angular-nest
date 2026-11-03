# 0034. Fleet shutdown: a resume file first, then a detached process closes the sessions, letting work finish by default

- Status: Accepted
- Date: 2026-11-03

## Context

The fleet ([ADR 0032](0032-agent-fleet.md)) could only stop logically:
`fleet.stop` keeps the manager from handing out work, but the tmux sessions,
the Claude conversations, dev servers and build daemons keep running. A plain
`tmux kill-session` ends only the processes that hold the terminal; a build
daemon or a watcher that left the process tree stays. It also saves no
conversation ids, and without them the only way back would be
`claude --continue`, which picks the wrong conversation. The owner asked for
a shutdown that first makes sure every session can be resumed and then
really ends the tmux sessions, and by default lets child processes finish
unless run with `--force`.

## Decision

The fleet is shut down by `scripts/fleet/fleet-shutdown.sh`, which the skill
`shutdown-fleet` calls:

- Return first: for every Claude process in the tree of every pane of the
  manager and fleet sessions, the script reads the conversation id from
  `~/.claude/sessions/<pid>.json` and checks that the transcript
  `<id>.jsonl` exists. It writes `.fleet/resume.md` with the command that
  brings back the manager (`resume-manager.sh`) and every worker
  (`claude --resume <id>` in the folder the conversation started in, where
  Claude Code keeps its transcript), with branch, worktree and uncommitted
  changes. When any id or transcript is missing, it aborts and kills nothing.
- Close second. This concerns the whole process tree of every pane and every
  process whose environment names one of those panes in `TMUX_PANE`.
  - Gentle by default: panes stay open (`remain-on-exit`), only Claude and
    the guard get SIGTERM, and the remaining work finishes on its own for up
    to `FLEET_SHUTDOWN_WAIT` seconds (30 minutes by default). Idle daemons
    (the `FLEET_SHUTDOWN_IDLE` pattern: Gradle and Kotlin daemons, watchers,
    dev servers) are not work, because they never end on their own; they get
    SIGTERM after the sessions close, when nothing uses them any more.
    Nothing gets SIGKILL: when something still works after the wait, it is
    left running with its sessions and daemons, and the report ends with
    `result: WAITING`.
  - `--force`: SIGTERM to everything at once, `tmux kill-session`, SIGKILL
    for survivors shortly after.
  - Both modes finally check every remembered PID together with its start
    time; the report (`.fleet/shutdown-report.txt`) lists anything that
    survived.
- The killing runs as a detached process (`setsid`, outside the panes'
  trees, without tmux variables) after a delay, because the manager usually
  calls the script from inside the session that is about to disappear.
- Session names come from `FLEET_MANAGER_SESSION` and `FLEET_SESSION` and
  match exactly. Tests use dummy sessions on a separate tmux server.

Rejected: `tmux kill-server` (kills sessions outside the fleet and saves no
conversations); killing by working directory inside worktrees (would also hit
the human's own sessions there); killing in the same process as the plan (the
manager would kill the script halfway, together with its own session);
waiting for the work before sending SIGTERM to Claude (a conversation in
the middle of a turn would start new work and the wait would never end).

## Consequences

After a shutdown `.fleet/` holds `resume.md`, `shutdown-report.txt` and the
`shutdown/` folder with copies. `.fleet/manager-session` always names the
conversation that actually ran. Worker records in `.fleet/workers/` stay as
they were, so after coming back the audit shows workers without a window
until the manager resumes them from `resume.md`. Isolated instances keep
running; `instance-cleanup` removes them. A process that cleared its
environment and left the tree is not found, and the report cannot tell. The
gentle mode assumes Claude Code does not kill its own background commands on
SIGTERM; that was not measured on a real session. What was measured
(2026-11-03) is that Bash tool commands run in their own session without a
controlling terminal, so closing a pane does not cut them off. Idle daemons
are told apart by a command-line pattern; a daemon outside it counts as work
and holds the shutdown until the wait runs out.
