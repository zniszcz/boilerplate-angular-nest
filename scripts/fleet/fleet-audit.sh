#!/usr/bin/env bash
# The manager's conscience. fleet-status.sh says what the workers report;
# this says what the MANAGER forgot. Every check here exists because a round
# was once closed with the thing still open — a gate hung for hours, a green
# PR sat unmerged, a dead worker was never restarted.
#
# Gates come in two kinds, FLEET_GATES in fleet.conf:
#   local   the manager runs FLEET_GATES_CMD on the PR's current head and posts
#           the result; the report ends with `<!-- gates <head-sha> ok|fail -->`,
#           which this audit compares with the PR head (repositories without CI);
#   github  GitHub Actions checks on the PR (statusCheckRollup).
# No Docker, no runners, no tablets.
#
# Prints one line per omission. An empty list is the only acceptable way to
# end a round; anything printed here must either be handled or written down
# with a reason before the turn ends.
#
# Usage: fleet-audit.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/fleet-lib.sh"
set +e

dir="$(fleet_dir)"
repo="$(fleet_repo)"
cd "$repo" || exit 1
now="$(date +%s)"
findings=0
WAITING_MAX_MINUTES=10

say() {
  findings=$((findings + 1))
  printf '%2d. %s\n' "$findings" "$*"
}

# --- stop and pause files from the human ----------------------------------
root="$(fleet_root)"
STOP_FILE="$FLEET_STOP_FILE"
PAUSE_FILE="$FLEET_PAUSE_FILE"
if [ -f "$root/$STOP_FILE" ]; then
  say "STOP FROM THE HUMAN: $root/$STOP_FILE exists — start no workers and no tasks; only the human removes the file"
fi
if [ -f "$root/$PAUSE_FILE" ]; then
  say "PAUSE FROM THE HUMAN: $root/$PAUSE_FILE exists — start no tasks until the time written in it"
fi

# --- cleanup, at the latest every third round -------------------------------
fleet_count_audit
rounds_since=$(($(fleet_round) - $(fleet_cleanup_round)))
if [ "$rounds_since" -ge 3 ]; then
  say "CLEANUP OVERDUE: rounds since the last one: $rounds_since — fleet-cleanup.sh, then close the browser tabs the fleet opened"
fi

# --- workers ---------------------------------------------------------------
alive_working=0
worktrees_open=0

if [ -d "$dir/workers" ]; then
  for file in "$dir"/workers/*.env; do
    [ -e "$file" ] || continue
    name="$(basename "$file" .env)"
    status="$(fleet_get "$name" status)"
    reported="$(fleet_get "$name" reported)"
    [ -n "$reported" ] || reported="$(fleet_get "$name" updated)"

    alive=no
    fleet_window_exists "$name" && alive=yes

    # A live window whose prompt still holds unsent text is NOT working: the
    # instruction was typed and never submitted. Costs hours when missed.
    # Read the pane twice, two seconds apart, and believe it only when both
    # reads agree: capture-pane serves the last painted frame.
    stuck=no
    if [ "$alive" = yes ]; then
      pane="$(fleet_window "$name")"
      if pane_has_unsent "$pane"; then
        sleep 2
        pane_has_unsent "$pane" && stuck=yes
      fi
    fi

    if [ -f "$dir/workers/$name.ask" ]; then
      say "UNANSWERED QUESTION: $name — read fleet-status.sh and answer with fleet-answer.sh"
    fi

    if [ "$stuck" = yes ]; then
      say "STUCK WITH AN UNSENT INSTRUCTION: $name — send an empty enter with fleet-answer.sh"
      # The screen keeps no time, so this counts from the first audit that saw it.
      since="$(fleet_get "$name" unsent_since)"
      if [ -z "$since" ]; then
        fleet_set "$name" unsent_since "$now"
      elif [ $(((now - since) / 60)) -ge "$WAITING_MAX_MINUTES" ]; then
        say "UNSENT TEXT LONGER THAN $WAITING_MAX_MINUTES MIN: $name stuck for $(((now - since) / 60)) min"
      fi
    elif [ -n "$(fleet_get "$name" unsent_since)" ]; then
      fleet_set "$name" unsent_since ""
    fi

    waiting=no
    [ -f "$dir/workers/$name.ask" ] && waiting=yes
    case "$status" in asking | blocked | ready-to-merge) waiting=yes ;; esac
    if [ "$waiting" = yes ] && then_s="$(date -d "$reported" +%s 2>/dev/null)" && [ -n "$reported" ] \
      && [ $(((now - then_s) / 60)) -ge "$WAITING_MAX_MINUTES" ]; then
      say "WAITING LONGER THAN $WAITING_MAX_MINUTES MIN: $name (status=$status) has waited for you for $(((now - then_s) / 60)) min"
    fi

    case "$alive:$status" in
      no:merged | no:retired | no:done) ;;
      no:*) say "DEAD WORKER: $name (status=$status) — fleet-tail.sh, then resume it or kill it and spawn again" ;;
    esac

    if [ "$alive" = yes ] && [ "$stuck" = no ]; then
      case "$status" in
        working | review) alive_working=$((alive_working + 1)) ;;
        ready-to-merge) say "WAITS FOR A DECISION: $name reported ready-to-merge — check the gates, review the diff and release" ;;
        blocked) say "BLOCKED: $name — find out by what and unblock it, or give it another task" ;;
      esac
    fi

    # A stale report from a live worker means the manager is reading fiction,
    # unless the worker is visibly mid-turn.
    if [ "$alive" = yes ] && [ -n "$reported" ] && ! pane_is_busy "$(fleet_window "$name")"; then
      then_s="$(date -d "$reported" +%s 2>/dev/null)"
      if [ -n "$then_s" ]; then
        age=$(((now - then_s) / 60))
        [ "$age" -ge 45 ] && say "STALE REPORT: $name has not reported for ${age} min — fleet-tail.sh and ask"
      fi
    fi
  done
fi

# .fleet/pool (gitignored) overrides the default pool size of three; the
# reviewer comes on top of the pool.
POOL="$(fleet_pool_size)"

# --- machine load -----------------------------------------------------------
# The only place the thresholds live; they are an assumption, not a measured
# limit. The load threshold is the core count itself.
GPU_MAX_PERCENT=90
MEM_MIN_GB=8
POOL_MIN=2

cores="$(nproc 2>/dev/null)"
load="$(cut -d' ' -f1 "${FLEET_LOADAVG:-/proc/loadavg}" 2>/dev/null)"
mem_kb="$(awk '/^MemAvailable:/ { print $2 }' "${FLEET_MEMINFO:-/proc/meminfo}" 2>/dev/null)"
gpu="$("${FLEET_NVIDIA_SMI:-nvidia-smi}" --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>/dev/null | sort -n | tail -n 1)"
# No nvidia-smi, a broken driver and "[N/A]" all mean the same: GPU unknown.
case "$gpu" in '' | *[!0-9]*) gpu="" ;; esac

load_text="load ${load:-unknown}"
gpu_text="GPU unknown"
[ -n "$gpu" ] && gpu_text="GPU ${gpu}%"
mem_text="available memory unknown"
[ -n "$mem_kb" ] && mem_text="available memory $(LC_ALL=C awk -v kb="$mem_kb" 'BEGIN { printf "%.1f", kb / 1048576 }') GB"

over=""
if [ -n "$load" ] && [ -n "$cores" ] && LC_ALL=C awk -v a="$load" -v b="$cores" 'BEGIN { exit !(a > b) }'; then
  over="$load_text with cores: $cores"
fi
if [ -n "$gpu" ] && [ "$gpu" -gt "$GPU_MAX_PERCENT" ]; then
  over="${over:+$over, }$gpu_text above ${GPU_MAX_PERCENT}%"
fi
if [ -n "$mem_kb" ] && [ "$mem_kb" -lt $((MEM_MIN_GB * 1048576)) ]; then
  over="${over:+$over, }$mem_text below ${MEM_MIN_GB} GB"
fi
if [ -n "$over" ]; then
  if [ "$POOL" -gt "$POOL_MIN" ]; then
    say "MACHINE OVERLOADED: $over — lower .fleet/pool from $POOL to $((POOL - 1)); do not kill working workers, start no new ones"
  else
    say "MACHINE OVERLOADED: $over — pool $POOL goes no lower than $POOL_MIN; do not kill working workers, start no new ones"
  fi
fi

live_workers="$(fleet_live_count)"
if [ "$live_workers" -gt "$POOL" ]; then
  say "POOL EXCEEDED: $live_workers unfinished workers with a limit of $POOL — start no new ones, close finished PRs"
fi
if [ ! -f "$root/$STOP_FILE" ] && [ ! -f "$root/$PAUSE_FILE" ] && [ "$alive_working" -lt "$POOL" ]; then
  say "POOL NOT FULL: $alive_working of $POOL workers working — take a task from a *.todo.md list and fleet-spawn.sh"
fi

# --- pull requests ---------------------------------------------------------
gates_cmd="${FLEET_GATES_CMD:-scripts/fleet/gates.sh}"
open_prs="$(gh pr list --base "$FLEET_MAIN" --state open --json number,headRefName,headRefOid,mergeStateStatus,files,statusCheckRollup 2>/dev/null)"
if [ -n "$open_prs" ] && [ "$open_prs" != "[]" ]; then
  while IFS=$'\t' read -r num branch head mstate outside checks; do
    [ -n "$num" ] || continue
    if [ "$outside" != "0" ]; then
      say "PR TOUCHES FILES OUTSIDE $FLEET_SCOPE: #$num ($branch), files: $outside — tell the worker to take them out of the branch"
    fi
    if [ "$FLEET_GATES" = github ]; then
      # GitHub Actions: none, pending, fail or ok, summed over the PR's checks.
      case "$checks" in
        none) say "PR WITHOUT CI CHECKS: #$num ($branch) — check that the workflow started (gh pr checks $num)"; continue ;;
        pending) continue ;;
        hung:*)
          # A job that runs this long is stuck, not queued.
          rest="${checks#hung:}"
          say "CI CHECK HANGS ${rest%%:*} min: PR #$num / ${rest#*:} — cancel the run and start it again"
          continue
          ;;
        fail) say "CI RED: PR #$num ($branch) — gh pr checks $num, have the worker fix it"; continue ;;
      esac
    else
      # The latest gates marker from the comments, and the head it was run on.
      marker="$(gh pr view "$num" --json comments --jq '[.comments[].body | capture("<!-- gates (?<sha>[0-9a-f]+) (?<res>ok|fail) -->")] | last | "\(.sha) \(.res)"' 2>/dev/null < /dev/null)"
      gsha="${marker%% *}"; gres="${marker##* }"
      if [ -z "$marker" ] || [ "$marker" = "null null" ] || [ "$gsha" != "$head" ]; then
        case "$mstate" in
          DIRTY) say "PR WITH A CONFLICT: #$num ($branch) — tell the worker to pull $FLEET_MAIN and resolve it" ;;
          *) say "PR WITHOUT GATES ON ITS CURRENT HEAD: #$num ($branch) — run $gates_cmd $num and post the result" ;;
        esac
        continue
      fi
      if [ "$gres" = fail ]; then
        say "GATES RED: PR #$num ($branch) — have the worker fix it"
        continue
      fi
    fi
    case "$mstate" in
      CLEAN | UNSTABLE | HAS_HOOKS) say "PR GREEN AND NOT MERGED: #$num ($branch) — review the diff and release it, or write down why it waits" ;;
      BEHIND) say "PR BEHIND $FLEET_MAIN: #$num ($branch) — tell the worker to pull $FLEET_MAIN, then gates again" ;;
      DIRTY) say "PR WITH A CONFLICT: #$num ($branch) — tell the worker to resolve it" ;;
    esac
  done <<< "$(printf '%s' "$open_prs" | FLEET_SCOPE="$FLEET_SCOPE" python3 -c "
import datetime, json, os, sys
scope = os.environ.get('FLEET_SCOPE', '')
hang = int(os.environ.get('FLEET_CI_HANG_MINUTES') or 30)
now = datetime.datetime.now(datetime.timezone.utc)
def checks(rollup):
    # An empty rollup is not green: a PR whose workflow never started has none.
    if not rollup:
        return 'none'
    states = [(c.get('conclusion') or c.get('state') or '').upper() for c in rollup]
    if any(s in ('FAILURE', 'ERROR', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE') for s in states):
        return 'fail'
    waiting = [c for c, s in zip(rollup, states) if s in ('', 'PENDING', 'EXPECTED', 'QUEUED', 'IN_PROGRESS')]
    for c in waiting:
        started = c.get('startedAt') or ''
        if started and not started.startswith('0001'):
            minutes = int((now - datetime.datetime.fromisoformat(started.replace('Z', '+00:00'))).total_seconds() // 60)
            if minutes >= hang:
                return 'hung:%d:%s' % (minutes, (c.get('name') or c.get('context') or '?').replace('\t', ' '))
    return 'pending' if waiting else 'ok'
for p in json.load(sys.stdin):
    outside = sum(1 for f in p.get('files', []) if scope and not f['path'].startswith(scope))
    print(p['number'], p['headRefName'], p['headRefOid'], p['mergeStateStatus'], outside,
          checks(p.get('statusCheckRollup')), sep='\t')
" 2>/dev/null)"
fi

# --- leftovers after a merge ----------------------------------------------
while IFS= read -r kept; do
  [ -n "$kept" ] && say "CLEANUP HELD: $kept — look at the worktree before you remove it"
done < <(cat "$dir/reap-kept" 2>/dev/null)

git fetch --prune -q 2>/dev/null

if [ -n "$FLEET_GUIDE" ]; then
  while read -r stale; do
    [ -n "$stale" ] || continue
    say "GUIDE OUT OF DATE: $stale — have it added to $FLEET_GUIDE, or note it there under \"Last review\""
  done <<< "$("$SCRIPT_DIR/fleet-guide-check.sh" "origin/$FLEET_MAIN" 2>&1)"
fi

for ref in $(git branch -r --format='%(refname:short)' 2>/dev/null | grep -v "origin/HEAD\|origin/$FLEET_MAIN\$"); do
  b="${ref#origin/}"
  state="$(gh pr list --head "$b" --state all --json state --jq '.[0].state' 2>/dev/null)"
  [ "$state" = MERGED ] && say "BRANCH LEFT AFTER MERGE: origin/$b — git push origin --delete $b"
done

while read -r path _ br; do
  [ -n "$path" ] || continue
  [ "$path" = "$repo" ] && continue
  worktrees_open=$((worktrees_open + 1))
  b="${br#[}"; b="${b%]}"
  state="$(gh pr list --head "$b" --state all --json state --jq '.[0].state' 2>/dev/null)"
  [ "$state" = MERGED ] && say "WORKTREE LEFT AFTER MERGE: $path ($b) — fleet-teardown.sh $b"
done <<< "$(git worktree list 2>/dev/null)"

[ "$worktrees_open" -ge 9 ] && say "WORKTREE CEILING: $worktrees_open of 9 — finish something before you spawn a new task"

# --- verdict ---------------------------------------------------------------
echo
echo "Load: $load_text, cores ${cores:-unknown}, $gpu_text, $mem_text"
if [ "$findings" -eq 0 ]; then
  echo "AUDIT CLEAN — nothing is pending, the round may close."
else
  echo "OMISSIONS: $findings — the turn may not close until each is handled or written down with a reason."
fi
exit 0
