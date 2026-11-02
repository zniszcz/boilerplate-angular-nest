#!/usr/bin/env bash
# Retire a worker: kill its whole process tree, then its tmux window.
#
# Killing the tree — not just `claude` — is the point. A worker that drove
# Chrome through the devtools MCP leaves a browser and an MCP server behind,
# and the next worker that reaches for Chrome then hangs. Only DESCENDANTS of
# this worker's pane are killed, so a Chrome that a human opened, or one
# belonging to another worker, is never touched.
#
# The worktree is NOT removed here: fleet-reap.sh or fleet-teardown.sh does it
# after a merge, and a worker killed mid-flight usually leaves work worth
# keeping. Use fleet-teardown.sh once you are sure.
#
# Usage: fleet-kill.sh <worker>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/fleet-lib.sh"

if [ $# -ne 1 ]; then
  echo "usage: $0 <worker>" >&2
  exit 1
fi

name="$1"
fleet_require_worker "$name"

descendants() {
  local pid="$1" child
  for child in $(ps -o pid= --ppid "$pid" 2>/dev/null); do
    descendants "$child"
    echo "$child"
  done
}

if fleet_window_exists "$name"; then
  pane_pid="$(tmux display-message -p -t "$(fleet_window "$name")" '#{pane_pid}')"
  pids="$(descendants "$pane_pid")"
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill -TERM $pids 2>/dev/null || true
    sleep 2
    # shellcheck disable=SC2086
    kill -KILL $pids 2>/dev/null || true
    echo "killed $(printf '%s\n' "$pids" | wc -l) descendant process(es) of pane $pane_pid"
  fi
  tmux kill-window -t "$(fleet_window "$name")"
fi

fleet_set "$name" status retired
fleet_set "$name" updated "$(date '+%Y-%m-%d %H:%M')"
rm -f "$(fleet_ask_file "$name")"
fleet_log "kill $name"
echo "worker '$name' retired (worktree left in place)"
