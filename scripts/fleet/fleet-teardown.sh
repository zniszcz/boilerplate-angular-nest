#!/usr/bin/env bash
# Remove everything a finished branch left on this machine: its worktree and
# its local branch, and first whatever FLEET_TEARDOWN_HOOK names (fleet.conf),
# for a repository whose worktrees carry more than git: a database, ports or a
# Docker project. The hook gets the branch as its only argument.
#
# Kills processes whose working directory is inside the worktree first (a
# build daemon or a dev server survives the worker and holds the directory).
#
# Usage: fleet-teardown.sh <branch>        # e.g. feat/orders
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/fleet-lib.sh"
set +e

if [ $# -ne 1 ] || [ -z "$1" ]; then
  echo "usage: $0 <branch>" >&2
  exit 1
fi
branch="$1"
repo="$(fleet_repo)"

if [ -n "${FLEET_TEARDOWN_HOOK:-}" ]; then
  echo "hook: $FLEET_TEARDOWN_HOOK $branch"
  (cd "$repo" && $FLEET_TEARDOWN_HOOK "$branch") 2>&1 | tail -n 3 | sed 's/^/  /'
fi

wt="$(git -C "$repo" worktree list 2>/dev/null | awk -v b="[$branch]" '$3 == b {print $1}')"
if [ -n "$wt" ] && [ -d "$wt" ]; then
  if [ "$wt" = "$repo" ]; then
    echo "error: refusing to tear down the main checkout" >&2
    exit 1
  fi
  echo "worktree: $wt"
  pids="$(for p in /proc/[0-9]*; do
    [ -r "$p/cwd" ] || continue
    case "$(readlink "$p/cwd" 2>/dev/null)" in
      "$wt" | "$wt"/*) printf '%s\n' "${p#/proc/}" ;;
    esac
  done)"
  if [ -n "$pids" ]; then
    echo "  processes holding the folder: $(printf '%s\n' "$pids" | wc -l)"
    kill $pids 2>/dev/null
    sleep 2
    for pid in $pids; do kill -9 "$pid" 2>/dev/null; done
  fi
  git -C "$repo" worktree remove --force "$wt" && echo "  worktree removed"
else
  echo "no worktree for $branch (already removed or never existed)"
fi

git -C "$repo" worktree prune
if git -C "$repo" show-ref --verify --quiet "refs/heads/$branch"; then
  git -C "$repo" branch -D "$branch" >/dev/null && echo "local branch deleted: $branch"
fi
if git -C "$repo" ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
  echo "remote branch origin/$branch still exists — a squash merge with --delete-branch should remove it; if not: git push origin --delete $branch"
fi

fleet_log "teardown $branch"
exit 0
