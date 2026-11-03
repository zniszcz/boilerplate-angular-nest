#!/usr/bin/env bash
# Brings the manager conversation back in tmux session "<FLEET_NAME>-manager": window
# "claude" resumes the saved conversation with Remote Control, window "guard"
# runs fleet-guard.sh against it. Attaches when everything already runs.
#
# The conversation id lives in .fleet/manager-session, so restarts never depend
# on --continue (which picks whatever conversation in the repo was written last).
#
# Usage: fleet-manager.sh               resume the saved conversation
#        fleet-manager.sh <session-id>  save a new id, then resume it
set -u
# fleet_root asks git, so run from the repo even when started from elsewhere.
cd "$(dirname "$(readlink -f "$0")")" || exit 1
. ./fleet-lib.sh

SESSION="$FLEET_MANAGER_SESSION"
RC_NAME="$FLEET_NAME manager"
ROOT="$(fleet_root)"
ID_FILE="$(fleet_dir)/manager-session"
GUARD="$(fleet_scripts)/fleet-guard.sh"
# Claude Code keys transcripts by the directory it was started in: the repository root.
mkdir -p "$(fleet_dir)"

if [ $# -ge 1 ]; then echo "$1" > "$ID_FILE"; fi
# fleet-lib.sh turns on set -e, so a missing id file must not abort the script.
ID="$(cat "$ID_FILE" 2>/dev/null || true)"
TRANSCRIPT="$HOME/.claude/projects/$(echo "$ROOT" | tr '/.' '--')/$ID.jsonl"
# No saved conversation, or it is gone: start a fresh manager with the skill
# instead of failing — the new id is recorded once Claude has started.
FRESH=0
if [ -z "$ID" ] || [ ! -f "$TRANSCRIPT" ]; then
  echo "No saved manager conversation${ID:+ ($ID)}. Starting a new one with /manage-fleet."
  FRESH=1
fi

attach() {
  if [ -n "${TMUX:-}" ]; then tmux switch-client -t "$SESSION"; else tmux attach -t "$SESSION"; fi
}

# Conversation id of the Claude process running in the given pane, if any.
pane_conversation() {
  local pid
  pid="$(tmux display -p -t "$1" '#{pane_pid}' 2>/dev/null)" || return
  for p in $pid $(pgrep -P "$pid"); do
    [ -f "$HOME/.claude/sessions/$p.json" ] && grep -o '"sessionId":"[^"]*"' "$HOME/.claude/sessions/$p.json" | cut -d'"' -f4
  done | head -1
}

if tmux has-session -t "$SESSION" 2>/dev/null; then
  running="$(pane_conversation "$SESSION:claude" || true)"
  [ -z "$running" ] && running="$(pane_conversation "$SESSION" || true)"
  if [ -n "$running" ] && [ "$running" = "$ID" ]; then
    tmux list-windows -t "$SESSION" -F '#W' | grep -qx guard \
      || tmux new-window -d -t "$SESSION" -n guard "$GUARD $SESSION:claude"
    attach
    exit 0
  fi
  echo "tmux session \"$SESSION\" already exists, but another conversation runs in it (${running:-unknown which})."
  echo "That conversation is not lost; it can be resumed later with claude --resume."
  read -r -p "Close it and start the manager? [y/N] " answer
  [ "$answer" = "y" ] || [ "$answer" = "Y" ] || exit 1
  tmux kill-session -t "$SESSION"
fi

cd "$ROOT" || exit 1
if [ "$FRESH" = 1 ]; then
  tmux new-session -d -s "$SESSION" -n claude -c "$ROOT" \
    "claude --dangerously-skip-permissions --remote-control '$RC_NAME' /manage-fleet"
  # Record the new conversation id so the next resume finds it.
  for _ in $(seq 1 30); do
    sleep 1
    new_id="$(pane_conversation "$SESSION:claude" || true)"
    [ -n "$new_id" ] && { echo "$new_id" > "$ID_FILE"; echo "New manager conversation: $new_id"; break; }
  done
else
  tmux new-session -d -s "$SESSION" -n claude -c "$ROOT" \
    "claude --dangerously-skip-permissions --remote-control '$RC_NAME' --resume $ID"
fi
tmux new-window -d -t "$SESSION" -n guard -c "$ROOT" "$GUARD $SESSION:claude"
attach
