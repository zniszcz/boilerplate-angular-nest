#!/usr/bin/env bash
# The manager's main read: every worker in one compact table, plus the full
# text of pending questions. Cheap enough to call every round — it never grows
# with how much the workers talked, only with how many they are.
#
# Usage: fleet-status.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/fleet-lib.sh"

dir="$(fleet_dir)"
if [ ! -d "$dir/workers" ] || [ -z "$(ls -A "$dir/workers" 2>/dev/null || true)" ]; then
  echo "fleet is empty — no workers"
  exit 0
fi

printf '%-28s %-15s %-18s %-5s %s\n' WORKER STATUS PHASE ALIVE NOTE
printf '%-28s %-15s %-18s %-5s %s\n' ---------------------------- --------------- ------------------ ----- ----------------------

for file in "$dir"/workers/*.env; do
  [ -e "$file" ] || continue
  name="$(basename "$file" .env)"
  alive=no
  fleet_window_exists "$name" && alive=yes

  # A worker whose prompt still holds text is NOT working — the instruction
  # never got submitted and it will idle silently until someone looks. Cheap to
  # detect here, expensive to miss: this cost the fleet 25 minutes once. The
  # three ways this read can lie are handled in pane_has_unsent.
  if [ "$alive" = yes ] && pane_has_unsent "$(fleet_window "$name")"; then
    alive="STOI"
  fi
  printf '%-28s %-15s %-18s %-5s %s\n' \
    "$name" \
    "$(fleet_get "$name" status)" \
    "$(fleet_get "$name" phase)" \
    "$alive" \
    "$(fleet_get "$name" note)"
done

echo
for file in "$dir"/workers/*.ask; do
  [ -e "$file" ] || continue
  name="$(basename "$file" .ask)"
  echo "── question from $name ──"
  cat "$file"
  echo
done

for file in "$dir"/workers/*.env; do
  [ -e "$file" ] || continue
  name="$(basename "$file" .env)"
  pr="$(fleet_get "$name" pr)"
  [ -n "$pr" ] && echo "PR $name: $pr"
done
exit 0
