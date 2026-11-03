#!/usr/bin/env bash
# Runs the checks of .github/workflows/checks.yml on this machine instead of
# GitHub Actions, for a private fork without free CI minutes. It is the local
# gate of the agent fleet too. The list of checks is scripts/fleet/gates.list;
# they run in a throwaway worktree at the pushed head of the branch or PR, so
# the working copy is never touched. See docs/development/ci-runners.md.
#
# Usage:
#   scripts/ci-local.sh [PR number | branch] [--post]
#     no argument   the current branch (it must be pushed)
#     --post        also post the report as a PR comment and set the commit
#                   status "local-checks" on the head, so branch protection
#                   can require it like a CI check
#   GATES_ONLY=lint,test scripts/ci-local.sh   run some checks; posts nothing
# Exit code 0 only when every check passed.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target=""; post=0
for a in "$@"; do
  case "$a" in
    --post) post=1 ;;
    *) target="$a" ;;
  esac
done
[ -n "$target" ] || target="$(git -C "$ROOT" branch --show-current)"

report="$(mktemp)"
trap 'rm -f "$report"' EXIT
"$ROOT/scripts/fleet/gates.sh" "$target" | tee "$report"
code="${PIPESTATUS[0]}"

if [ "$post" = 1 ] && [ -z "${GATES_ONLY:-}" ]; then
  marker="$(tail -n 1 "$report")"
  sha="$(printf '%s' "$marker" | sed -nE 's/^<!-- gates ([0-9a-f]+) (ok|fail) -->$/\1/p')"
  if [ -z "$sha" ]; then
    echo "error: the report has no marker, nothing posted" >&2
    exit 2
  fi
  state=failure; [ "$code" = 0 ] && state=success
  repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
  gh api -X POST "repos/$repo/statuses/$sha" -f state="$state" -f context=local-checks \
    -f description="scripts/ci-local.sh on $(hostname)" >/dev/null && echo "commit status local-checks: $state"
  if [[ "$target" =~ ^[0-9]+$ ]]; then pr="$target"; else pr="$(gh pr view "$target" --json number --jq .number 2>/dev/null || true)"; fi
  if [ -n "$pr" ]; then gh pr comment "$pr" --body-file "$report" >/dev/null && echo "report posted to PR #$pr"; fi
fi
exit "$code"
