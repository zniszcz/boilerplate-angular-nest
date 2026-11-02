#!/usr/bin/env bash
# Remove a finished worker whose pull request is merged: fleet-kill.sh,
# fleet-teardown.sh and moving its record to the archive.
#
# The PR is looked up by the number in the record's pr field (a link or a bare
# number), so a deleted remote branch does not hide it; without it, by branch.
#
# Finished means status merged or done, nothing queued for it, no turn in progress
# and no unsent text. Anything else is left alone: a worker without a merged PR
# (a reviewer, a closed PR) stays the manager's call, and a worker with an open PR
# or with work the merge does not contain stays and is reported. Each reason is
# printed once; .fleet/reap-kept holds the current list, which fleet-audit.sh reads.
#
# Usage: fleet-reap.sh   (the guard runs it every tenth look)
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/fleet-lib.sh"
set +e

dir="$(fleet_dir)"
repo="$(fleet_repo)"
cd "$repo" || exit 1
kept_file="$dir/reap-kept"
kept_now=""

keep() {
  kept_now+="$1 ($2)"$'\n'
  grep -qxF "$1 ($2)" "$kept_file" 2>/dev/null || echo "kept: $1 ($2)"
}

worktree_of() {
  git worktree list --porcelain | awk -v want="branch refs/heads/$1" '
    /^worktree / { path = substr($0, 10) }
    $0 == want { print path }'
}

for file in "$dir"/workers/*.env; do
  [ -e "$file" ] || continue
  name="$(basename "$file" .env)"
  case "$(fleet_get "$name" status)" in merged | done) ;; *) continue ;; esac
  branch="$(fleet_get "$name" branch)"
  [ -n "$branch" ] || continue

  pane="$(fleet_window "$name")"
  alive=no
  fleet_window_exists "$name" && alive=yes
  # Mid-turn is a passing state, so the next run decides.
  if [ "$alive" = yes ] && pane_is_busy "$pane"; then continue; fi

  # The PR number from the record finds the PR even after its remote branch was
  # deleted; a record without it falls back to the branch name.
  pr="$(fleet_get "$name" pr)"
  pr="${pr%%[?#]*}"; pr="${pr%/}"; pr="${pr##*/}"
  if [[ "$pr" =~ ^[0-9]+$ ]]; then
    if ! view="$(gh pr view "$pr" --json state,headRefOid --jq '"\(.state) \(.headRefOid)"' 2>/dev/null < /dev/null)"; then
      keep "$name" "cannot read the state of PR #$pr"
      continue
    fi
    open=""; merged=""
    case "$view" in
      OPEN\ *) open="$pr" ;;
      MERGED\ *) merged="${view#MERGED }" ;;
    esac
  elif ! open="$(gh pr list --head "$branch" --state open --json number --jq '.[].number' 2>/dev/null < /dev/null)" \
    || ! merged="$(gh pr list --head "$branch" --state merged --json headRefOid --jq '.[].headRefOid' 2>/dev/null < /dev/null)"; then
    keep "$name" "cannot read the state of the PR of branch $branch"
    continue
  fi
  if [ -n "$open" ]; then
    keep "$name" "open PR #$open"
    continue
  fi
  [ -n "$merged" ] || continue

  if [ "$alive" = yes ] && pane_has_unsent "$pane"; then
    keep "$name" "unsent text in the session"
    continue
  fi
  wt="$(worktree_of "$branch")"
  if [ -n "$wt" ]; then
    hold="$(fleet_worktree_hold "$wt" "$merged")"
    if [ -n "$hold" ]; then
      keep "$name" "$wt: $hold"
      continue
    fi
  fi

  "$SCRIPT_DIR/fleet-kill.sh" "$name" >/dev/null
  "$SCRIPT_DIR/fleet-teardown.sh" "$branch" >/dev/null
  if [ -n "$wt" ] && [ -d "$wt" ]; then
    keep "$name" "$wt: fleet-teardown.sh did not remove it"
  elif ! fleet_archive_record "$name"; then
    keep "$name" "the archive already has such a record"
  else
    echo "removed: $name ($branch)"
  fi
  fleet_log "reap $name ($branch)"
done

printf '%s' "$kept_now" > "$kept_file"
exit 0
