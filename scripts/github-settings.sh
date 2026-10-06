#!/usr/bin/env bash
# Applies the repository settings on GitHub that the workflow relies on. Safe
# to run many times; run it once in every fork. Needs `gh auth login` with
# admin rights to the repository.
# Usage: scripts/github-settings.sh [owner/repo]   (defaults to this clone's)
# See docs/adr/0027-squash-merges.md.
set -euo pipefail

REPO=${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}

# One commit per pull request on main: its title becomes the commit subject,
# so it follows Conventional Commits, and its description the body. The
# branch is deleted after the merge.
gh api --method PATCH "repos/$REPO" \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY \
  -F delete_branch_on_merge=true \
  --jq '"\(.full_name): squash only, title \(.squash_merge_commit_title), delete branch \(.delete_branch_on_merge)"'
