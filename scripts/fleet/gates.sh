#!/usr/bin/env bash
# Local gates of a pull request, for a repository without free CI (see
# docs/development/ci-runners.md). The manager runs them on a PR and posts the
# result as a comment (`scripts/fleet/gates.sh <nr> | gh pr comment <nr>
# --body-file -`, or `scripts/ci-local.sh <nr> --post`); fleet-audit.sh reads
# the marker in the last line to know the gates passed on the PR's current head.
#
# Gates:
#   paths   when FLEET_SCOPE (fleet.conf) is set: every changed file is inside it
#   others  in order from gates.list next to this script: `key|label|command`; the
#           command runs in a throwaway worktree at the PR's head, with FLEET_REPO
#           (the main checkout) and FLEET_BASE (the merge base) in its environment.
#           A non-zero exit fails the gate and the run.
#
# Usage: scripts/fleet/gates.sh <PR number | branch>
# Exit code 0 only when every gate passed. The output is Markdown for the PR.
# GATES_ONLY=key,key runs some gates and prints no marker for the audit: a
# partial run proves nothing about a PR.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/fleet-lib.sh"
set +e

REPO="$(fleet_repo)"
LIST="${FLEET_GATES_LIST:-$SCRIPT_DIR/gates.list}"

if [ $# -ne 1 ]; then
  echo "usage: $0 <PR number | branch>" >&2
  exit 2
fi

cd "$REPO" || exit 2
if [[ "$1" =~ ^[0-9]+$ ]]; then
  branch="$(gh pr view "$1" --json headRefName --jq .headRefName)" || { echo "error: cannot read PR #$1" >&2; exit 2; }
  label="PR #$1 ($branch)"
else
  branch="$1"
  label="$branch"
fi

git fetch -q origin "$FLEET_MAIN" "$branch" || { echo "error: cannot fetch origin/$branch" >&2; exit 2; }
head="$(git rev-parse "origin/$branch")"
base="$(git merge-base "origin/$FLEET_MAIN" "origin/$branch")"

rows=()
status=ok
only="${GATES_ONLY:-}"
started=$SECONDS
# Each row reports the time since the previous one, so a gate keeps no clock.
row() { rows+=("| $1 | $2 | $3 | $((SECONDS - started)) s |"); started=$SECONDS; [ "$2" != "❌" ] || status=fail; }
wanted() { [ -z "$only" ] || [[ ",$only," == *",$1,"* ]] || { row "$2" "⏭️" "not in \`GATES_ONLY\`"; return 1; }; }
one_line() { printf '%s' "$1" | tail -"$2" | sed 's/|/\\|/g' | tr '\n' ' ' | cut -c1-600; }

# --- paths --------------------------------------------------------------------
changed="$(git diff --name-only "$base" "$head")"
if [ -n "$FLEET_SCOPE" ] && wanted paths "paths"; then
  outside="$(printf '%s\n' "$changed" | grep -v "^$FLEET_SCOPE" | grep -c . || true)"
  if [ "$outside" = 0 ]; then
    row "paths" "✅" "changed files: $(printf '%s\n' "$changed" | grep -c .), all in \`$FLEET_SCOPE\`"
  else
    row "paths" "❌" "files outside \`$FLEET_SCOPE\`: $outside: $(printf '%s\n' "$changed" | grep -v "^$FLEET_SCOPE" | head -5 | tr '\n' ' ')"
  fi
fi

# --- gates from the list --------------------------------------------------------
tmp="$(mktemp -d "${TMPDIR:-/tmp}/$FLEET_NAME-gates.XXXXXX")"
cleanup() { git -C "$REPO" worktree remove --force "$tmp" >/dev/null 2>&1; rm -rf "$tmp"; }
trap cleanup EXIT
if ! git worktree add -q --detach "$tmp" "$head" 2>/dev/null; then
  row "worktree" "❌" "cannot create a throwaway worktree for $head"
elif [ ! -f "$LIST" ]; then
  row "gate list" "❌" "no file $LIST"
else
  while IFS='|' read -r key what cmd; do
    case "$key" in '' | \#*) continue ;; esac
    wanted "$key" "$what" || continue
    log="$(cd "$tmp" && FLEET_REPO="$REPO" FLEET_BASE="$base" timeout "${GATES_TIMEOUT:-1800}" bash -c "$cmd" 2>&1 < /dev/null)"
    code=$?
    if [ "$code" = 0 ]; then
      row "$what" "✅" "$(one_line "$log" 1)"
    else
      row "$what" "❌" "exit $code; last lines: $(one_line "$log" 8)"
    fi
  done < "$LIST"
fi

# --- report ---------------------------------------------------------------------
echo "### Local gates: $label"
echo
echo "HEAD \`${head:0:10}\`, base \`${base:0:10}\` (origin/$FLEET_MAIN), $(date '+%Y-%m-%d %H:%M')."
echo
echo "| Gate | Result | Detail | Time |"
echo "|---|---|---|---|"
printf '%s\n' "${rows[@]}"
echo
echo "Time of all gates: $SECONDS s."
echo
if [ "$status" = ok ]; then
  echo "All gates passed."
else
  echo "At least one gate failed; the PR goes back to its author."
fi
echo
echo "🤖 Claude Code"
[ -n "$only" ] || echo "<!-- gates $head $status -->"
[ "$status" = ok ]
