#!/usr/bin/env bash
# Answer a worker: type the text into its Claude session and clear the pending
# question, so the same question is never served twice.
#
# Also the general "say something to a worker" channel — a nudge, a correction,
# a new instruction. Sending to a worker that was not asking is fine.
#
# Usage: fleet-answer.sh <worker> <text...>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/fleet-lib.sh"

if [ $# -lt 2 ]; then
  echo "usage: $0 <worker> <text...>" >&2
  exit 1
fi

name="$1"; shift
text="$*"
fleet_require_worker "$name"

if ! fleet_window_exists "$name"; then
  echo "error: worker '$name' has no live tmux window" >&2
  exit 1
fi

# Two steps on purpose: the text lands in the prompt, then Enter submits it.
# Sending both at once makes Claude's input box swallow the newline.
#
# The submit is then VERIFIED, because a busy session can eat it and leave the
# whole instruction sitting unsent in the prompt — a worker parked that way
# looks alive in tmux and idles for as long as nobody reads its screen. That
# cost the fleet twenty-five minutes once, so we re-send rather than assume.
#
# NEVER send Escape to a worker pane to "clear" or "unstick" it: Escape wipes
# whatever sits in the prompt, so an instruction waiting to be submitted is
# destroyed instead of sent. It happened once and the instruction had to be
# retyped from memory.
#
# Submit with the literal C-m, not the `Enter` key name: a session mid-turn
# ignored three `Enter`s in a row and accepted C-m immediately. Whatever the
# cause, the raw control character is the one that has never failed here.
win="$(fleet_window "$name")"

# Deliver through a tmux buffer, not send-keys -l. A long instruction typed
# key-by-key can be cut in half by the TUI's paste handling: the submit lands
# on the first half and the rest sits in the prompt, so the worker acts on a
# fragment of the message and the manager never learns. Pasting the whole
# buffer at once, then waiting before the submit, keeps the message whole.
printf '%s' "$text" | tmux load-buffer -b fleet-answer -
tmux paste-buffer -d -b fleet-answer -t "$win"
sleep 1
tmux send-keys -t "$win" C-m

for _ in 1 2 3 4 5; do
  sleep 2
  pane_has_unsent "$win" || { leftover=""; break; }
  leftover=unsent
  tmux send-keys -t "$win" C-m
done
if [ -n "${leftover:-}" ]; then
  echo "warning: '$name' still shows unsent input — check the screen" >&2
fi

rm -f "$(fleet_ask_file "$name")"
fleet_set "$name" status working
fleet_set "$name" updated "$(date '+%Y-%m-%d %H:%M')"
fleet_log "answer $name: $(printf '%s' "$text" | head -c 120)"
echo "sent to $name"
