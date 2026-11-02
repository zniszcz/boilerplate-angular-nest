#!/usr/bin/env bash
# Heartbeat for the manager session, used instead of a session cron. Every 30 s it
# looks at the manager's tmux pane and types /manage-fleet when a worker queued an
# event (review, ready-to-merge, blocked, asking, done) or the pane has not
# changed for a whole interval. It types ONLY when the pane stood still since the
# last look, the session is not mid-turn and the prompt is empty; an event then
# waits in its file. A human talking to the manager changes the screen, so the
# ping never lands in the middle of a conversation. Every tenth look it also runs
# fleet-reap.sh.
#
# Typing is careful: the prompt line is cleared (Ctrl+U), the command is checked
# to stand in the prompt before Enter and to be gone after it; a failed attempt is
# retried with a growing pause, then left for the next round.
#
# Usage: fleet-guard.sh [tmux-target] [minutes]   (default target: <FLEET_NAME>-manager)
#        GUARD_SECONDS=60 fleet-guard.sh <session>  (short interval for a test)
# The interval comes from guard.conf (GUARD_MINUTES), copied from
# guard.conf.example on first start and re-read every round; a minutes
# argument or GUARD_SECONDS overrides it.
# Stop:  touch ~/.<FLEET_NAME>-guard-stop  or Ctrl+C in the guard's window.
set -u
. "$(dirname "$0")/fleet-lib.sh"
# The library turns on errexit; one failed tmux call must not end the guard.
set +e +o pipefail

TARGET="${1:-$FLEET_MANAGER_SESSION}"
CONF="$(dirname "$0")/guard.conf"
[ -f "$CONF" ] || cp "$(dirname "$0")/guard.conf.example" "$CONF"
# Seconds of stillness before an idle wake-up: GUARD_SECONDS, else the minutes argument, else
# GUARD_MINUTES from guard.conf (read anew each round), else 7.
interval() {
  if [ -n "${GUARD_SECONDS:-}" ]; then echo "$GUARD_SECONDS"; return; fi
  local m="${ARG_MINUTES:-}"
  [ -n "$m" ] || m="$(sed -n 's/^GUARD_MINUTES=\([0-9][0-9]*\)[[:space:]]*$/\1/p' "$CONF" 2>/dev/null | tail -1)"
  [ "${m:-0}" -ge 1 ] 2>/dev/null || m=7
  echo $(( m * 60 ))
}
ARG_MINUTES="${2:-}"
INTERVAL="$(interval)"
POLL=30
REAP_EVERY_TICKS=10
RETRIES=3
COMMAND="${GUARD_COMMAND:-/manage-fleet}"
STOP="$HOME/.$FLEET_NAME-guard-stop"
LOG="$(fleet_dir)/guard.log"
rm -f "$STOP"
mkdir -p "$(fleet_dir)"

say() { echo "$(date '+%F %H:%M:%S') guard: $*" | tee -a "$LOG"; }
# The pane without blank lines (the prompt can float above empty rows).
pane() { tmux capture-pane -p -t "$TARGET" 2>/dev/null | grep -v '^[[:space:]]*$'; }
# Claude Code's prompt: the lines between the last two horizontal rules.
input_line() { pane | awk '{ l[NR] = $0; if ($0 ~ /^─────/) sep[++n] = NR } END { if (n >= 2) for (k = sep[n-1] + 1; k < sep[n]; k++) print l[k] }'; }
clear_input() {
  tmux send-keys -t "$TARGET" C-u
  sleep 1
  if input_line | grep -qF "$COMMAND"; then tmux send-keys -t "$TARGET" -N 300 BSpace; sleep 1; fi
}

# One attempt; 0 when the command went out.
bump() {
  clear_input
  tmux send-keys -t "$TARGET" -l "$COMMAND"
  sleep 2
  if ! input_line | grep -qF "$COMMAND"; then clear_input; return 1; fi
  tmux send-keys -t "$TARGET" Enter
  sleep 5
  if input_line | grep -qF "$COMMAND"; then clear_input; return 1; fi
  return 0
}

# A client attached with a tiny terminal shrinks the pane (measured 2026-10-31:
# 154x2). The prompt and "esc to interrupt" then fall off the capture, so a busy
# manager looks idle and every wake-up fails. Keep a readable height.
MIN_ROWS=20
keep_readable() {
  local rows
  rows="$(tmux display -p -t "$TARGET" '#{pane_height}' 2>/dev/null)" || return 0
  [ "${rows:-0}" -ge "$MIN_ROWS" ] && return 0
  say "pane has $rows rows, resizing to 50"
  tmux resize-window -t "$TARGET" -y 50
  sleep 3
}

# What fleet-report.sh queued moves to a second file before the wake-up, and that
# file goes only after the wake-up succeeded. A report arriving during a failed
# attempt stays in the queue, and nothing is forgotten across a guard restart.
EVENTS="$(fleet_dir)/events"
DELIVERING="$EVENTS.delivering"
claim_events() {
  [ -f "$DELIVERING" ] || { [ -f "$EVENTS" ] && mv "$EVENTS" "$DELIVERING"; }
  [ -f "$DELIVERING" ]
}

wake() {
  local i wait
  for i in $(seq 1 "$RETRIES"); do
    if bump; then say "manager woken"; return 0; fi
    wait=$(( INTERVAL * (1 << (i - 1)) / 12 ))
    say "attempt $i failed, next in $wait s"
    sleep "$wait"
  done
  say "could not wake the manager, next round"
  return 1
}

# The removal is not time-critical and asks GitHub about each finished worker.
reap() {
  ticks=$(( ticks + 1 ))
  [ $(( ticks % REAP_EVERY_TICKS )) -eq 0 ] || return 0
  "$(dirname "$0")/fleet-reap.sh" 2>&1 | while IFS= read -r line; do say "reap: $line"; done
}

say "start (target $TARGET, looks every $POLL s, idle wake-up after $INTERVAL s, command $COMMAND)"
last=""
still=0
ticks=0
held=""
looks=0
while [ ! -f "$STOP" ]; do
  new="$(interval)"
  [ "$new" != "$INTERVAL" ] && say "interval now $new s (guard.conf)"
  INTERVAL="$new"
  sleep "$POLL"
  [ -f "$STOP" ] && break
  looks=$(( looks + 1 ))
  [ "$looks" -gt "${GUARD_MAX_LOOKS:-$looks}" ] && break
  reap
  if ! tmux has-session -t "${TARGET%%:*}" 2>/dev/null; then
    say "no tmux session for $TARGET"; last=""; still=0; continue
  fi
  keep_readable
  now="$(pane | md5sum)"
  if [ "$now" = "$last" ]; then still=$(( still + POLL )); else still=0; fi
  reason=""
  if claim_events; then reason="events: $(awk '{ print $3 "=" $4 }' "$DELIVERING" | paste -sd' ')"
  elif [ "$still" -ge "$INTERVAL" ]; then reason="pane idle for $still s"; fi

  # A screen that moved since the last look belongs to someone: the manager at
  # work or a human reading. Waiting costs one look, typing over them costs more.
  if [ -n "$reason" ] && [ "$now" = "$last" ]; then
    # Never type over a half-written message: Ctrl+U would wipe it.
    if pane_has_unsent "$TARGET"; then
      if [ "$held" != "$now" ]; then
        # Log what sat in the prompt (escaped, styling kept) so a false positive,
        # e.g. a dimmed suggestion, can be told from real text afterwards.
        seen="$(tmux capture-pane -p -e -t "$TARGET" | grep -a '❯' | tail -1 | cat -v | cut -c1-160)"
        say "$reason, but the prompt holds unsent text — leaving it alone: $seen"
        held="$now"
      fi
    elif ! pane_is_busy "$TARGET"; then
      say "$reason, waking the manager"
      if wake; then rm -f "$DELIVERING"; fi
      still=0
      now="$(pane | md5sum)"
    fi
  fi
  last="$now"
done
say "stop"
