# 0034. Fleet shutdown: a resume file first, then whole process trees killed by a detached process

- Status: Accepted
- Date: 2026-11-03

## Context

The fleet ([ADR 0032](0032-agent-fleet.md)) could only stop logically:
`fleet.stop` keeps the manager from handing out work, but the tmux sessions,
the Claude conversations, dev servers and build daemons keep running. A plain
`tmux kill-session` ends only the processes that hold the terminal; a build
daemon or a watcher that left the process tree stays. It also saves no
conversation ids, and without them the only way back would be
`claude --continue`, which picks the wrong conversation.

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
- Kill second: SIGTERM to the whole process tree of every pane and to every
  process whose environment names one of those panes in `TMUX_PANE`, then
  `tmux kill-session`, then SIGKILL for survivors and a new check of every
  remembered PID together with its start time. The final report
  (`.fleet/shutdown-report.txt`) lists anything that could not be killed.
- The killing runs as a detached process (`setsid`, outside the panes'
  trees, without tmux variables) after a delay, because the manager usually
  calls the script from inside the session that is about to disappear.
- Session names come from `FLEET_MANAGER_SESSION` and `FLEET_SESSION` and
  match exactly. Tests use dummy sessions on a separate tmux server.

Rejected: `tmux kill-server` (kills sessions outside the fleet and saves no
conversations); killing by working directory inside worktrees (would also hit
the human's own sessions there); killing in the same process as the plan (the
manager would kill the script halfway, together with its own session).

## Consequences

After a shutdown `.fleet/` holds `resume.md`, `shutdown-report.txt` and the
`shutdown/` folder with copies. `.fleet/manager-session` always names the
conversation that actually ran. Worker records in `.fleet/workers/` stay as
they were, so after coming back the audit shows workers without a window
until the manager resumes them from `resume.md`. Isolated instances keep
running; `instance-cleanup` removes them. A process that cleared its
environment and left the tree is not found, and the report cannot tell.
