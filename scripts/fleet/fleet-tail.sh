#!/usr/bin/env bash
# Look at a worker's screen. THE EXCEPTION, not the routine: the manager works
# off fleet-status.sh and reaches for this only when a worker looks stuck,
# contradicts its own state file, or died. Every call costs manager context.
#
# Usage: fleet-tail.sh <worker> [lines]   (default 40)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/fleet-lib.sh"

if [ $# -lt 1 ]; then
  echo "usage: $0 <worker> [lines]" >&2
  exit 1
fi

name="$1"
lines="${2:-40}"

if ! fleet_window_exists "$name"; then
  echo "error: worker '$name' has no live tmux window" >&2
  exit 1
fi

tmux capture-pane -p -t "$(fleet_window "$name")" -S "-$lines"
