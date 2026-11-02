#!/usr/bin/env bash
# Remove what the fleet left behind, and only what is provably safe to remove:
#   - gate directories no running gate can still need,
#   - worktrees of merged branches (their builds and caches go with them),
#   - state records of retired workers, moved to the archive.
#
# When in doubt it keeps the thing and reports it. Docker and browser tabs are
# out of reach on purpose: tabs are the manager's step in SKILL.md, because only
# the manager knows which ones the fleet opened.
#
# Records the time and round in .fleet/last-cleanup, which fleet-audit.sh reads.
#
# Usage: fleet-cleanup.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/fleet-lib.sh"
set +e

dir="$(fleet_dir)"
repo="$(fleet_repo)"
# A gate between two steps holds no directory, so its process is the only proof
# that it is alive. Anchored on the interpreter because every worker's command
# line quotes this path in its prompt. Overridable so tests ignore real gates
# running on this machine.
gates_process="^([^ ]*/)?bash ${FLEET_GATES_SCRIPT:-[^ ]*gates\.sh}( |\$)"
removed=0
kept=0

done_() {
  removed=$((removed + 1))
  echo "removed: $*"
}

keep() {
  kept=$((kept + 1))
  echo "kept: $*"
}

held_by_process() {
  local p
  for p in /proc/[0-9]*; do
    case "$(readlink "$p/cwd" 2>/dev/null)" in
      "$1" | "$1"/*) return 0 ;;
    esac
  done
  return 1
}

free_space() {
  df -h --output=avail "$repo" | tail -n 1 | tr -d ' '
}

echo "free space before: $(free_space)"

# --- gate directories ------------------------------------------------------
for gate in "${TMPDIR:-/tmp}"/"$FLEET_NAME"-gates.*; do
  [ -d "$gate" ] && [ ! -L "$gate" ] && [ -O "$gate" ] || continue
  if pgrep -f "$gates_process" >/dev/null; then
    keep "$gate (gates are running)"
  elif held_by_process "$gate"; then
    keep "$gate (a process holds the folder)"
  else
    git -C "$repo" worktree remove --force "$gate" >/dev/null 2>&1
    rm -rf "$gate"
    done_ "$gate"
  fi
done
git -C "$repo" worktree prune

# --- worktrees of merged branches ------------------------------------------
while read -r wt branch; do
  [ -n "$wt" ] && [ "$wt" != "$repo" ] && [ -n "$branch" ] || continue
  if ! merged="$(gh pr list --head "$branch" --state merged --json headRefOid --jq '.[].headRefOid' 2>/dev/null < /dev/null)"; then
    keep "$wt (cannot read the state of the PR of branch $branch)"
    continue
  fi
  [ -n "$merged" ] || continue

  if fleet_window_exists "$(fleet_slug "$branch")"; then
    keep "$wt (the worker is still alive)"
  elif hold="$(fleet_worktree_hold "$wt" "$merged")"; [ -n "$hold" ]; then
    keep "$wt ($hold)"
  else
    size="$(du -sh "$wt" 2>/dev/null | cut -f1)"
    "$SCRIPT_DIR/fleet-teardown.sh" "$branch" >/dev/null
    if [ -d "$wt" ]; then
      keep "$wt (fleet-teardown.sh did not remove it)"
    else
      done_ "$wt with its builds and caches ($size)"
    fi
  fi
done <<< "$(git -C "$repo" worktree list --porcelain | awk '
  /^worktree / { path = substr($0, 10); branch = "" }
  /^branch refs\/heads\// { branch = substr($0, 19) }
  /^$/ { print path, branch }
')"

# --- records of retired workers --------------------------------------------
for file in "$dir"/workers/*.env; do
  [ -e "$file" ] || continue
  name="$(basename "$file" .env)"
  [ "$(fleet_get "$name" status)" = retired ] || continue
  if fleet_window_exists "$name"; then
    keep "record $name (its window is still open)"
  elif fleet_archive_record "$name"; then
    done_ "record $name moved to the archive"
  else
    keep "record $name (the archive already has such a record)"
  fi
done

printf 'time=%s\nround=%s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$(fleet_round)" > "$dir/last-cleanup"
fleet_log "cleanup: removed $removed, kept $kept"

echo "free space after: $(free_space)"
echo "total removed: $removed, kept: $kept"
exit 0
