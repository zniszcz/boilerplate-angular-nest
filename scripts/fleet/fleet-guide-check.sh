#!/usr/bin/env bash
# Lists what landed on a ref after the last change of the human guide
# (FLEET_GUIDE in fleet.conf, e.g. docs/what-to-read.md) and may belong in it: a
# document, an ADR or a command. It measures only the age of the guide;
# whether the guide says the right thing is for a human to judge. The fleet
# tooling itself (.agents/, .claude/, scripts/fleet/) and tests do not count.
#
# What counts, set in fleet.conf (space-separated, relative to the repository):
#   FLEET_GUIDE_DOCS      directories whose new *.md files are documents (default: docs)
#   FLEET_GUIDE_COMMANDS  directories whose new top-level files are commands (default: tools scripts)
# plus a command added to or removed from "scripts" in package.json.
#
# Usage: fleet-guide-check.sh [ref], run inside the repository.
# Prints one line per finding. Exit code 0 only when there are none.
set -uo pipefail

. "$(dirname "${BASH_SOURCE[0]}")/fleet-lib.sh"
set +e

GUIDE="$FLEET_GUIDE"
ref="${1:-origin/$FLEET_MAIN}"
docs="${FLEET_GUIDE_DOCS:-docs}"
commands="${FLEET_GUIDE_COMMANDS:-tools scripts}"
[ -n "$GUIDE" ] || exit 0

if ! git rev-parse -q --verify "$ref^{commit}" >/dev/null; then
  echo "unknown ref $ref"
  exit 2
fi

if ! git cat-file -e "$ref:$GUIDE" 2>/dev/null; then
  echo "$ref has no file $GUIDE"
  exit 1
fi
last="$(git log -1 --format=%H "$ref" -- "$GUIDE")"

kind_of() {
  local dir
  case "$1" in
    .agents/* | .claude/* | scripts/fleet/* | */test/* | */tests/* | test/*) return ;;
  esac
  for dir in $docs; do
    case "$1" in
      "$dir"/adr/*.md) echo "ADR"; return ;;
      "$dir"/*.md) echo "document"; return ;;
    esac
  done
  for dir in $commands; do
    case "$1" in
      "$dir"/*/*) ;;
      "$dir"/*) echo "command"; return ;;
    esac
  done
}

findings="$(
  commit=""
  git log --reverse --diff-filter=A --name-only --format='@%h' "$last..$ref" |
    while read -r line; do
      case "$line" in
        "") ;;
        @*) commit="${line#@}" ;;
        *)
          kind="$(kind_of "$line")"
          [ -z "$kind" ] || echo "$commit added: $kind $line"
          ;;
      esac
    done
  # A new or removed command in "scripts" of package.json. Only the names count,
  # so a dependency bump or a changed command line is not a finding.
  if git cat-file -e "$ref:package.json" 2>/dev/null; then
    { git show "$last:package.json" 2>/dev/null || echo '{}'; echo; echo '@@@'; git show "$ref:package.json"; } \
      | python3 -c "
import json, sys
old, new = sys.stdin.read().split('@@@')
names = lambda text: set(json.loads(text or '{}').get('scripts', {}))
changed = sorted(names(new) ^ names(old))
if changed:
    print('$(git rev-parse --short "$ref") changed: commands in package.json: ' + ', '.join(changed))
" 2>/dev/null
  fi
)"

[ -n "$findings" ] || exit 0
printf '%s\n' "$findings"
exit 1
