#!/usr/bin/env bash
# Keeps the newest versions of an app's image in GHCR and deletes the rest,
# so the registry does not grow forever. A version tagged `prod` is never
# deleted, however old: production runs it and must be able to pull it again.
# `prod` is the working name of the promotion tag (scope item 23).
# Usage: scripts/prune-images.sh <app> [keep]   (keep defaults to 10)
# Needs GH_TOKEN with packages:write. DRY_RUN=1 only lists what would go.
set -euo pipefail

APP=$1
KEEP=${2:-10}
OWNER=${GITHUB_REPOSITORY_OWNER:-zniszcz}
REPO=${GITHUB_REPOSITORY:-zniszcz/boilerplate-angular-nest}
PACKAGE=$(printf '%s/%s' "${REPO#*/}" "$APP" | sed 's#/#%2F#g')
BASE="/users/$OWNER/packages/container/$PACKAGE/versions"
PROTECTED=prod

# Newest first: id, then tags separated by commas.
versions=$(gh api --paginate "$BASE?per_page=100" \
  --jq 'sort_by(.created_at) | reverse | .[] | "\(.id) \(.metadata.container.tags | join(","))"')

kept=0
while read -r id tags; do
  [ -z "$id" ] && continue
  if [[ ",$tags," == *",$PROTECTED,"* ]]; then
    echo "keep $id ($tags): tagged $PROTECTED"
  elif [ "$kept" -lt "$KEEP" ]; then
    kept=$((kept + 1))
  elif [ "${DRY_RUN:-0}" = 1 ]; then
    echo "would delete $id (${tags:-untagged})"
  else
    gh api --method DELETE "$BASE/$id" >/dev/null
    echo "deleted $id (${tags:-untagged})"
  fi
done <<<"$versions"
