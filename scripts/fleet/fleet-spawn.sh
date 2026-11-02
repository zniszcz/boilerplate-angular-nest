#!/usr/bin/env bash
# Start one worker: a Claude session in its own tmux window, told to ship the
# given task through the worker skill (FLEET_WORKER_SKILL) in managed mode.
#
# The worker sets up its own worktree (phase 2 of the worker skill), so
# this script only prepares the opening prompt and the window. It refuses to
# spawn from a non-main HEAD, because the worktree branches off HEAD.
#
# Usage: fleet-spawn.sh <branch-name> <task-description...>
#        FLEET_BRIEF=REVIEWER-BRIEF.md fleet-spawn.sh chore/review-2026-11-02 "Review"
#   e.g. fleet-spawn.sh feat/orders "Orders list (item 1.04 of backlog.todo.md)"
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/fleet-lib.sh"

if [ $# -lt 2 ]; then
  echo "usage: $0 <branch-name> <task-description...>" >&2
  exit 1
fi

branch="$1"; shift
task="$*"
name="$(fleet_slug "$branch")"
root="$(fleet_root)"
dir="$(fleet_dir)"

head_branch="$(git -C "$root" rev-parse --abbrev-ref HEAD)"
if [ "$head_branch" != "$FLEET_MAIN" ]; then
  echo "error: main checkout is on '$head_branch'; workers must branch off $FLEET_MAIN" >&2
  exit 1
fi

if fleet_window_exists "$name"; then
  echo "error: worker '$name' already runs (tmux window $(fleet_window "$name"))" >&2
  exit 1
fi

# The pool is a limit, not a target: an unfinished worker holds its place until
# it is merged or retired, and further tasks wait in the todo list. Only the
# reviewer comes on top of the pool, up to the hard ceiling of nine.
live="$(fleet_live_count)"
pool="$(fleet_pool_size)"
if [ "$live" -ge 9 ]; then
  echo "error: 9 unfinished workers already exist — retire one before spawning another" >&2
  exit 1
fi
if [ "${FLEET_BRIEF:-}" != "REVIEWER-BRIEF.md" ] && [ "$live" -ge "$pool" ]; then
  echo "error: pool full ($live unfinished of $pool) — queue the task in a todo list and merge or retire a worker first" >&2
  exit 1
fi

mkdir -p "$dir/workers"
prompt_file="$dir/workers/$name.prompt"

# FLEET_BRIEF picks the brief: WORKER-BRIEF.md (default, FLEET_WORKER_SKILL) or
# REVIEWER-BRIEF.md (FLEET_REVIEWER_SKILL). FLEET_SKILL overrides the skill name.
# The briefs live next to the manager skill, FLEET_BRIEF_DIR from fleet.conf.
brief="${FLEET_BRIEF:-WORKER-BRIEF.md}"
skill="${FLEET_SKILL:-${FLEET_WORKER_SKILL:-ship-task}}"
case "$brief" in REVIEWER-BRIEF.md) skill="${FLEET_SKILL:-${FLEET_REVIEWER_SKILL:-review-project}}" ;; esac
brief_file="$root/${FLEET_BRIEF_DIR:-.agents/skills/manage-fleet}/$brief"
if [ ! -f "$brief_file" ]; then
  echo "error: no brief $brief_file" >&2
  exit 1
fi
{
  cat "$brief_file"
  echo
  echo "## Your id in the fleet"
  echo
  echo "Your name is \`$name\`. Your branch is \`$branch\`."
  echo "You report with: \`$SCRIPT_DIR/fleet-report.sh --worker $name ...\`"
  echo
  echo "## Task"
  echo
  echo "$task"
  echo
  echo "Start with the skill $skill: read .claude/skills/$skill/SKILL.md and follow it."
} > "$prompt_file"

if ! tmux has-session -t "$FLEET_SESSION" 2>/dev/null; then
  tmux new-session -d -s "$FLEET_SESSION" -n "$name" -c "$root"
else
  tmux new-window -t "$FLEET_SESSION" -n "$name" -c "$root"
fi

fleet_set "$name" branch "$branch"
fleet_set "$name" task "$task"
fleet_set "$name" status starting
fleet_set "$name" phase "1/5 grooming"
fleet_set "$name" note "spawned"
fleet_set "$name" pr ""
fleet_set "$name" updated "$(date '+%Y-%m-%d %H:%M')"

# Launch through a file so no quoting of the (long, multiline) brief is needed.
#
# Two flags carry the whole managed mode:
#   --remote-control  is on from the start under a predictable name, because it
#                     cannot be retrofitted into a running session and the
#                     human must be able to drop into any worker from a phone.
#   --dangerously-skip-permissions  because nobody is sitting at this terminal.
#                     A permission dialog would park the worker forever: the
#                     manager reads state files, not screens, so it would not
#                     even learn why the worker went quiet. Isolation does the
#                     guarding instead — own worktree per worker — and the
#                     irreversible steps (merge, deploy) are taken away from
#                     workers by WORKER-BRIEF.md.
#
tmux send-keys -t "$(fleet_window "$name")" \
  "claude --dangerously-skip-permissions --remote-control '$FLEET_NAME-$name' \"\$(cat '$prompt_file')\"" Enter

fleet_log "spawn $name ($branch): $task"
echo "worker '$name' started in tmux window $(fleet_window "$name")"
