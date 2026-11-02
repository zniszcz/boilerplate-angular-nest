#!/usr/bin/env bash
# Shared helpers for the fleet scripts. Sourced, never executed.
#
# The fleet's whole state lives in $ROOT/.fleet (gitignored) so that the
# manager reads small files instead of scraping terminals:
#
#   .fleet/workers/<name>.env     key=value status line (one worker)
#   .fleet/workers/<name>.ask     pending question, free text, absent = none
#   .fleet/workers/<name>.prompt  opening prompt handed to `claude` at spawn
#   .fleet/log                    append-only trail of fleet-level events
#   .fleet/events                 statuses waiting to wake the manager
#   .fleet/reap-kept              finished workers fleet-reap.sh refused to remove
#
# Worker name == tmux window name == branch slug, so one identifier addresses
# the tmux window, the state files and the worktree directory.

set -euo pipefail

# Repository settings: fleet name, main branch, change scope, gates.
# fleet.conf sits next to the scripts and is in git; an environment variable of
# the same name wins (tests and one-off overrides).
_fleet_conf="$(dirname "${BASH_SOURCE[0]}")/fleet.conf"
if [ -f "$_fleet_conf" ]; then
  while IFS='=' read -r _k _v; do
    case "$_k" in FLEET_[A-Z_]*) [ -n "${!_k+x}" ] || printf -v "$_k" '%s' "$_v" ;; esac
  done < <(grep -E '^FLEET_[A-Z_]+=' "$_fleet_conf")
fi

# Short fleet name: prefix of the tmux sessions, Remote Control names, the
# guard's stop file and gate directories. Defaults to the repository folder.
FLEET_NAME="${FLEET_NAME:-$(basename "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g')}"
FLEET_SESSION="${FLEET_SESSION:-$FLEET_NAME-fleet}"
FLEET_MANAGER_SESSION="${FLEET_MANAGER_SESSION:-$FLEET_NAME-manager}"
# The branch task branches start from and pull requests go back to.
FLEET_MAIN="${FLEET_MAIN:-main}"
# Path prefix workers may change; empty means the whole repository.
FLEET_SCOPE="${FLEET_SCOPE:-}"
# How the audit knows a PR passed its gates: local (a marker from
# scripts/fleet/gates.sh in a PR comment) or github (GitHub Actions checks).
FLEET_GATES="${FLEET_GATES:-local}"
# Files in the fleet root that stop the fleet, or pause it until the time
# written inside; only the human writes them.
FLEET_STOP_FILE="${FLEET_STOP_FILE:-fleet.stop}"
FLEET_PAUSE_FILE="${FLEET_PAUSE_FILE:-fleet.pause}"
# The human guide whose age the audit watches; empty turns the check off.
FLEET_GUIDE="${FLEET_GUIDE-docs/what-to-read.md}"

# The fleet scripts folder; workers call fleet-report.sh from it.
fleet_scripts() {
  cd "$(dirname "${BASH_SOURCE[0]}")" && pwd
}

# Root of the repository the fleet lives in: two levels above scripts/fleet.
# Fleet state and task lists are in the main checkout, never in a worktree.
fleet_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

# The git repository git and gh work in.
fleet_repo() {
  git -C "$(fleet_root)" rev-parse --show-toplevel
}

fleet_dir() {
  echo "$(fleet_root)/.fleet"
}

fleet_slug() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

fleet_state_file() {
  echo "$(fleet_dir)/workers/$1.env"
}

fleet_ask_file() {
  echo "$(fleet_dir)/workers/$1.ask"
}

fleet_require_worker() {
  local name="$1"
  if [ ! -f "$(fleet_state_file "$name")" ]; then
    echo "error: no such worker '$name' (see fleet-status.sh)" >&2
    exit 1
  fi
}

# Read one key out of a worker's state file; empty string when unset.
fleet_get() {
  local name="$1" key="$2"
  sed -n "s/^${key}=//p" "$(fleet_state_file "$name")" | tail -n 1
}

# Write one key into a worker's state file, replacing any previous value.
fleet_set() {
  local name="$1" key="$2" value="$3"
  local file
  file="$(fleet_state_file "$name")"
  mkdir -p "$(dirname "$file")"
  touch "$file"
  local tmp="${file}.tmp.$$"
  grep -v "^${key}=" "$file" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$file"
}

# True when the worker's work is over and only its record is left. A status other
# than these, a missing one included, means the worker still holds its place.
fleet_is_finished() {
  case "$(fleet_get "$1" status)" in
    merged | done | retired) return 0 ;;
    *) return 1 ;;
  esac
}

# Remember a status the manager must hear about. A file, not a look at the
# current status: the guard may be asleep or stopped when the worker reports, and
# the worker may have moved on by the time the manager can be woken.
fleet_queue_event() {
  mkdir -p "$(fleet_dir)"
  printf '%s %s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" "$2" >> "$(fleet_dir)/events"
}

# Why a merged branch's worktree must stay; prints nothing when removing it loses
# no work. Ignored files (builds, *.todo.md) are not work.
#
# Commits after the squash-merge lose nothing when every file the branch changed,
# against its merge base or after its merged head, is already on the base branch
# in the same or a newer form: the branch's version of the file (or its absence)
# is the base branch's current one or one the base branch went through since the
# branch forked off. That covers an older guide left behind and a merge of the
# main branch into the branch. Any git step that fails keeps the worktree.
fleet_worktree_hold() {
  local wt="$1" merged_heads="$2" base="${FLEET_BASE_REF:-origin/$FLEET_MAIN}"
  local head mb changed file mine theirs lost="" absent=0000000000000000000000000000000000000000
  if [ -n "$(git -C "$wt" status --porcelain 2>/dev/null)" ]; then
    echo "uncommitted work"
    return
  fi
  head="$(git -C "$wt" rev-parse HEAD 2>/dev/null)"
  printf '%s\n' "$merged_heads" | grep -qx "$head" && return
  if ! mb="$(git -C "$wt" merge-base HEAD "$base" 2>/dev/null)" \
    || ! changed="$(git -C "$wt" -c core.quotePath=false diff --name-only --no-renames "$mb" HEAD 2>/dev/null)"; then
    echo "commits after the merge, cannot compare with $base"
    return
  fi
  # A commit after the merge can undo something the net diff no longer shows, for
  # example delete a file the branch itself added, so the files those commits
  # touched are checked too. The base branch's history counts from the earliest
  # fork point: after a merge of the main branch the merge base sits past the squash.
  local merged since=("^$mb")
  for merged in $merged_heads; do
    git -C "$wt" merge-base --is-ancestor "$merged" HEAD 2>/dev/null || continue
    since+=("^$(git -C "$wt" merge-base "$merged" "$base" 2>/dev/null)")
    changed+=$'\n'"$(git -C "$wt" -c core.quotePath=false diff --name-only --no-renames "$merged" HEAD 2>/dev/null)" \
      || { echo "commits after the merge, cannot compare with $base"; return; }
  done
  changed="$(printf '%s\n' "$changed" | sort -u)"
  # A path git had to quote matches nothing below, so it keeps the worktree.
  while IFS= read -r file; do
    [ -n "$file" ] || continue
    mine="$(git -C "$wt" rev-parse --verify --quiet "HEAD:$file")" || mine="$absent"
    theirs="$(git -C "$wt" rev-parse --verify --quiet "$base:$file")" || theirs="$absent"
    [ "$mine" = "$theirs" ] && continue
    git -C "$wt" log -m --format= --raw --no-abbrev --no-renames "$base" "${since[@]}" -- "$file" 2>/dev/null \
      | awk -v want="$mine" '$4 == want { found = 1 } END { exit !found }' \
      || lost+="${lost:+, }$file"
  done <<< "$changed"
  [ -z "$lost" ] || echo "commits after the merge bring: $lost"
}

# Move a retired worker's files to the archive; refuses to overwrite an old record.
fleet_archive_record() {
  local archive
  archive="$(fleet_dir)/workers-archive"
  [ ! -e "$archive/$1.env" ] || return 1
  mkdir -p "$archive"
  mv "$(fleet_dir)/workers/$1".* "$archive/"
}

fleet_log() {
  local dir
  dir="$(fleet_dir)"
  mkdir -p "$dir"
  printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$dir/log"
}

# The current round. Nothing marks where a round starts, but SKILL.md opens and
# closes each one with fleet-audit.sh, so two audits make a round. An extra
# audit only brings a reminder forward, which is the harmless direction.
fleet_round() {
  local audits
  audits="$(cat "$(fleet_dir)/audit-count" 2>/dev/null || echo 0)"
  echo $(((audits + 1) / 2))
}

fleet_count_audit() {
  local audits
  audits="$(cat "$(fleet_dir)/audit-count" 2>/dev/null || echo 0)"
  echo $((audits + 1)) > "$(fleet_dir)/audit-count"
}

# The round of the last cleanup; 0 when there was none or the file holds no round.
fleet_cleanup_round() {
  local round
  round="$(sed -n 's/^round=\([0-9][0-9]*\)$/\1/p' "$(fleet_dir)/last-cleanup" 2>/dev/null | tail -n 1)"
  echo "${round:-0}"
}

fleet_window() {
  echo "${FLEET_SESSION}:$1"
}

fleet_window_exists() {
  tmux list-windows -t "$FLEET_SESSION" -F '#{window_name}' 2>/dev/null | grep -qx "$1"
}

# The last six rows of the pane that hold anything; an extra argument goes to
# capture-pane. A row with only styling codes (-e) still counts as empty.
pane_bottom() {
  tmux capture-pane -p ${2:-} -t "$1" 2>/dev/null | grep -av '^\([[:space:]]\|\x1b\[[0-9;]*m\)*$' | tail -6
}

# True when the pane's prompt holds text that was never submitted.
#
# Three ways to be fooled, all of them paid for once:
#   - "esc to interrupt" in the footer means the session is MID-TURN. Whatever
#     is in the prompt is queued behind the current turn, not forgotten.
#   - "Press up to edit queued messages" is placeholder text, not input.
#   - capture-pane serves the last painted frame, so an unattended pane can
#     hold a stale one — callers read twice and believe only agreeing reads.
#   - capture-pane pads the pane with empty rows, and the prompt can float above
#     them. A plain tail then sees only blanks: measured 2026-10-31 on real tmux,
#     the guard wiped a typed sentence. Hence pane_bottom.
pane_has_unsent() {
  local pane="$1" screen
  screen="$(pane_bottom "$pane" | tr -d '\302\240')"
  printf '%s' "$screen" | grep -q 'esc to interrupt' && return 1
  printf '%s' "$screen" | grep -q 'Press up to edit queued messages' && return 1
  printf '%s' "$screen" | grep -q '^❯[[:space:]]*[^[:space:]]' || return 1
  # An empty prompt can still show a suggested reply, drawn dimmed (SGR 2).
  # Measured 2026-10-27: the guard took a suggested reply for unsent text
  # and never woke the manager. Text right after ❯ that starts dimmed is that
  # suggestion, not something a person typed.
  ! pane_bottom "$pane" -e | tr -d '\302\240' \
    | grep -a '❯' | tail -1 | grep -qaP '❯\s*(\e\[[0-9;]*m)*\e\[2m'
}

# True when the session is mid-turn — the TUI prints "esc to interrupt" only
# while it is actually working. A busy worker that has not reported in a while
# is quiet, not dead, and the difference matters: one needs chasing, the other
# is just deep in a long step.
pane_is_busy() {
  pane_bottom "$1" | grep -q 'esc to interrupt'
}

# Unfinished workers hold a place in the pool, also when parked on a decision.
fleet_live_count() {
  local state live=0
  for state in "$(fleet_dir)"/workers/*.env; do
    [ -f "$state" ] || continue
    fleet_is_finished "$(basename "$state" .env)" || live=$((live + 1))
  done
  echo "$live"
}

# Pool size: FLEET_POOL, else .fleet/pool, else 3.
fleet_pool_size() { echo "${FLEET_POOL:-$(cat "$(fleet_dir)/pool" 2>/dev/null || echo 3)}"; }
