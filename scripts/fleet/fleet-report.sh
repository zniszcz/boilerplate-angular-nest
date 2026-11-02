#!/usr/bin/env bash
# Called BY A WORKER to publish its state. This is the only channel the manager
# reads regularly — it exists so the manager never has to parse a terminal.
#
# Usage:
#   fleet-report.sh --worker <name> --status working --phase "5/12 build" --note "..."
#   fleet-report.sh --worker <name> --ask "A question no assumption can answer"
#   fleet-report.sh --worker <name> --pr https://github.com/...
#
# Statuses the manager understands:
#   starting | working | asking | review | ready-to-merge | merged | blocked | done
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/fleet-lib.sh"

worker=""; status=""; phase=""; note=""; pr=""; ask=""
while [ $# -gt 0 ]; do
  case "$1" in
    --worker) worker="$2"; shift 2 ;;
    --status) status="$2"; shift 2 ;;
    --phase)  phase="$2";  shift 2 ;;
    --note)   note="$2";   shift 2 ;;
    --pr)     pr="$2";     shift 2 ;;
    --ask)    ask="$2";    shift 2 ;;
    *) echo "error: unknown argument '$1'" >&2; exit 1 ;;
  esac
done

if [ -z "$worker" ]; then
  echo "error: --worker is required" >&2
  exit 1
fi

mkdir -p "$(fleet_dir)/workers"
touch "$(fleet_state_file "$worker")"
previous="$(fleet_get "$worker" status)"

[ -n "$status" ] && fleet_set "$worker" status "$status"
[ -n "$phase" ]  && fleet_set "$worker" phase  "$phase"
[ -n "$note" ]   && fleet_set "$worker" note   "$note"
[ -n "$pr" ]     && fleet_set "$worker" pr     "$pr"

if [ -n "$ask" ]; then
  printf '%s\n' "$ask" > "$(fleet_ask_file "$worker")"
  fleet_set "$worker" status asking
  fleet_log "ask $worker: $(printf '%s' "$ask" | head -c 120)"
  fleet_queue_event "$worker" asking
elif [ "$status" != "$previous" ]; then
  case "$status" in
    review | ready-to-merge | blocked | asking | done) fleet_queue_event "$worker" "$status" ;;
  esac
fi

fleet_set "$worker" updated "$(date '+%Y-%m-%d %H:%M')"
# `reported` is stamped ONLY here, by the worker itself. `updated` also moves
# when the manager talks to the worker, so using it to judge silence lets a
# manager's own message reset the clock on a worker that stopped reporting.
fleet_set "$worker" reported "$(date '+%Y-%m-%d %H:%M')"
