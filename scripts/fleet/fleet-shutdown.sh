#!/usr/bin/env bash
# Shut the fleet down so that it can come back: first make sure every Claude
# conversation in the fleet's tmux sessions can be resumed, then kill those
# sessions together with every process they started.
#
# Step 1, return. For every pane of the manager and fleet sessions the script
# finds the Claude processes in the pane's process tree and reads their
# conversation id from <claude dir>/sessions/<pid>.json (Claude Code writes it
# for each running process). It checks that the transcript <id>.jsonl exists,
# then writes a resume file to .fleet/shutdown/ (and .fleet/resume.md): the
# manager's id and command (resume-manager.sh), and for every worker its id,
# branch, worktree, uncommitted changes and the exact `claude --resume` command.
# A Claude process whose id or transcript cannot be found aborts everything:
# nothing is killed.
#
# Step 2, kill. The manager usually runs this from inside its own tmux session,
# so the killing runs as a detached process (setsid, outside every pane) after
# FLEET_SHUTDOWN_DELAY seconds, once the plan and the resume file are written.
# It sends SIGTERM to the whole tree of every pane, plus any process whose
# environment still names one of these panes (a build daemon or watcher that
# left the tree), kills the tmux sessions, waits FLEET_SHUTDOWN_GRACE seconds,
# SIGKILLs survivors and checks every remembered PID again. The final report,
# with anything that could not be killed, goes to .fleet/shutdown/report-*.txt
# and .fleet/shutdown-report.txt; its last line starts with "result:".
#
# Sessions: FLEET_MANAGER_SESSION and FLEET_SESSION (fleet.conf, environment
# wins), so tests run against dummy sessions. Only exact names match.
#
# Usage: fleet-shutdown.sh [--dry-run]
#   --dry-run  print the plan (ids, commands, processes) and change nothing
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/fleet-lib.sh"

usage() { echo "usage: $0 [--dry-run]"; }

# The detached second step re-enters the script.
if [ "${1:-}" = "--kill-step" ]; then
  MODE=kill
  STAMP="$2"
else
  MODE=plan
  DRY=0
  case "${1:-}" in
    "") ;;
    --dry-run) DRY=1 ;;
    -h | --help) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
  esac
  [ $# -le 1 ] || { usage >&2; exit 2; }
  STAMP="$(date '+%Y%m%d-%H%M%S')"
fi

CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
DELAY="${FLEET_SHUTDOWN_DELAY:-5}"
GRACE="${FLEET_SHUTDOWN_GRACE:-5}"
ROOT="$(fleet_root)"
OUT="$(fleet_dir)/shutdown"
PID_FILE="$OUT/pids-$STAMP"

# Start time of a process (field 22 of /proc/<pid>/stat), so a PID reused by an
# unrelated process after the snapshot is never killed. Empty when it is gone.
start_time() {
  local stat
  stat="$(cat "/proc/$1/stat" 2>/dev/null)" || return 0
  # The command name can hold spaces and parentheses; fields follow the last ")".
  stat="${stat##*) }"
  # shellcheck disable=SC2086
  set -- $stat
  echo "${20}"
}

# True while the process exists and is not a zombie waiting to be reaped.
alive() {
  local pid="$1" want="${2:-}" stat
  stat="$(cat "/proc/$pid/stat" 2>/dev/null)" || return 1
  stat="${stat##*) }"
  [ "${stat%% *}" != Z ] || return 1
  [ -z "$want" ] || [ "$(start_time "$pid")" = "$want" ]
}

# PIDs of every process below the given ones, read from one ps snapshot.
descendants() {
  ps -e -o pid=,ppid= | awk -v roots=" $* " '
    { parent[$1] = $2; order[NR] = $1 }
    END {
      n = split(roots, queue, " ")
      for (i = 1; i <= n; i++) seen[queue[i]] = 1
      changed = 1
      while (changed) {
        changed = 0
        for (j = 1; j <= NR; j++) {
          p = order[j]
          if (!(p in seen) && (parent[p] in seen)) { seen[p] = 1; print p; changed = 1 }
        }
      }
    }'
}

# Live target sessions; `=name` matches the exact name, never a prefix.
target_sessions() {
  local s
  for s in "$FLEET_MANAGER_SESSION" "$FLEET_SESSION"; do
    [ -n "$s" ] && tmux has-session -t "=$s" 2>/dev/null && echo "$s"
  done
  return 0
}

# "<pane id> <pane pid> <session> <window name>" for every pane of the sessions.
panes() {
  local s
  for s in "$@"; do
    tmux list-panes -s -t "=$s" -F "#{pane_id} #{pane_pid} $s #{window_name}" 2>/dev/null
  done
  return 0
}

# Processes that left a pane's tree (double fork, daemon) but still carry its
# TMUX_PANE and this tmux server's socket in their environment.
by_environment() {
  local socket="$1" ids="$2" proc pid env pane
  [ -n "$socket" ] || return 0
  for proc in /proc/[0-9]*; do
    pid="${proc#/proc/}"
    env="$(tr '\0' '\n' < "$proc/environ" 2>/dev/null)" || continue
    printf '%s\n' "$env" | grep -q "^TMUX=$socket," || continue
    pane="$(printf '%s\n' "$env" | sed -n 's/^TMUX_PANE=//p')"
    case " $ids " in *" $pane "*) echo "$pid" ;; esac
  done
}

# Every PID the shutdown must end: pane trees plus environment matches, minus
# this process and its own children.
collect_pids() {
  local socket ids roots self
  [ "$#" -gt 0 ] || return 0
  socket="$(tmux display-message -p -t "=$1" '#{socket_path}' 2>/dev/null || true)"
  ids="$(panes "$@" | awk '{print $1}' | tr '\n' ' ')"
  roots="$(panes "$@" | awk '{print $2}' | tr '\n' ' ')"
  self=" $$ $(descendants $$ | tr '\n' ' ') "
  { for r in $roots; do echo "$r"; done; descendants $roots; by_environment "$socket" "$ids"; } \
    | sort -un | while read -r pid; do
      case "$self" in *" $pid "*) continue ;; esac
      [ "$pid" -gt 1 ] && echo "$pid"
    done
}

session_field() {
  sed -n "s/.*\"$2\":\"\([^\"]*\)\".*/\1/p" "$1" | head -n 1
}

# ---------------------------------------------------------------- kill step
if [ "$MODE" = kill ]; then
  sleep "$DELAY"
  report="$OUT/report-$STAMP.txt"
  sessions=()
  while read -r s; do [ -n "$s" ] && sessions+=("$s"); done < <(sed -n 's/^session //p' "$PID_FILE")
  live=()
  for s in "${sessions[@]}"; do tmux has-session -t "=$s" 2>/dev/null && live+=("$s"); done
  # The remembered PIDs (still the same processes) plus anything started since.
  declare -A want=()
  while read -r pid st; do alive "$pid" "$st" && want[$pid]="$st"; done < <(sed -n 's/^pid //p' "$PID_FILE")
  if [ "${#live[@]}" -gt 0 ]; then
    while read -r pid; do
      [ -n "${want[$pid]+x}" ] || want[$pid]="$(start_time "$pid")"
    done < <(collect_pids "${live[@]}")
  fi
  {
    echo "fleet shutdown $STAMP"
    echo "sessions: ${sessions[*]}"
    echo "processes to end: ${#want[@]}"
  } > "$report"
  for pid in "${!want[@]}"; do kill -TERM "$pid" 2>/dev/null || true; done
  for s in "${live[@]}"; do tmux kill-session -t "=$s" 2>/dev/null || true; done
  for _ in $(seq 1 $((GRACE * 5))); do
    left=0
    for pid in "${!want[@]}"; do alive "$pid" "${want[$pid]}" && left=1 && break; done
    [ "$left" = 0 ] && break
    sleep 0.2
  done
  killed=0
  for pid in "${!want[@]}"; do
    if alive "$pid" "${want[$pid]}"; then kill -KILL "$pid" 2>/dev/null || true; killed=$((killed + 1)); fi
  done
  sleep 1
  echo "SIGKILL needed: $killed" >> "$report"
  failed=0
  for pid in "${!want[@]}"; do
    if alive "$pid" "${want[$pid]}"; then
      echo "NOT KILLED: pid $pid $(ps -o args= -p "$pid" 2>/dev/null | cut -c1-120)" >> "$report"
      failed=$((failed + 1))
    fi
  done
  for s in "${sessions[@]}"; do
    if tmux has-session -t "=$s" 2>/dev/null; then
      echo "NOT KILLED: tmux session $s" >> "$report"
      failed=$((failed + 1))
    fi
  done
  if [ "$failed" = 0 ]; then
    echo "result: ok, sessions gone and no remembered process survives" >> "$report"
  else
    echo "result: FAILED, $failed item(s) still alive (see above)" >> "$report"
  fi
  cp "$report" "$(fleet_dir)/shutdown-report.txt"
  rm -f "$PID_FILE"
  fleet_log "shutdown $STAMP: $(tail -n 1 "$report")"
  exit 0
fi

# ---------------------------------------------------------------- plan step
mapfile -t SESSIONS < <(target_sessions)
if [ "${#SESSIONS[@]}" -eq 0 ]; then
  echo "nothing to shut down: no tmux session named $FLEET_MANAGER_SESSION or $FLEET_SESSION"
  exit 0
fi

problems=()
resume=""
declare -A COMM=()
while read -r pid comm; do COMM[$pid]="$comm"; done < <(ps -e -o pid=,comm=)

manager_id=""
saved_id="$(cat "$(fleet_dir)/manager-session" 2>/dev/null || true)"

while read -r pane_id pane_pid session window; do
  tree="$pane_pid $(descendants "$pane_pid" | tr '\n' ' ')"
  claudes=()
  for pid in $tree; do [ "${COMM[$pid]:-}" = claude ] && claudes+=("$pid"); done
  label="$session:$window ($pane_id)"
  if [ "${#claudes[@]}" -eq 0 ]; then
    resume+=$'\n'"## $label"$'\n\n'"No Claude conversation in this pane; nothing to resume."$'\n'
    continue
  fi
  for pid in "${claudes[@]}"; do
    json="$CLAUDE_DIR/sessions/$pid.json"
    if [ ! -f "$json" ]; then
      problems+=("$label: Claude process $pid has no $json, so its conversation id is unknown")
      continue
    fi
    id="$(session_field "$json" sessionId)"
    cwd="$(session_field "$json" cwd)"
    if [ -z "$id" ]; then
      problems+=("$label: $json has no sessionId")
      continue
    fi
    transcript="$(find "$CLAUDE_DIR/projects" -maxdepth 2 -name "$id.jsonl" -print -quit 2>/dev/null || true)"
    if [ -z "$transcript" ]; then
      problems+=("$label: no transcript $id.jsonl under $CLAUDE_DIR/projects, so --resume $id would fail")
      continue
    fi
    if [ "$session" = "$FLEET_MANAGER_SESSION" ]; then
      manager_id="$id"
      resume+=$'\n'"## Manager: $label"$'\n\n'"- Conversation: \`$id\`"$'\n'
      if [ -n "$saved_id" ] && [ "$saved_id" != "$id" ]; then
        resume+="- .fleet/manager-session held \`$saved_id\`; it now holds the running id \`$id\`."$'\n'
      fi
      resume+="- Come back: \`$ROOT/resume-manager.sh\`"$'\n'
      continue
    fi
    branch=""
    [ -f "$(fleet_state_file "$window")" ] && branch="$(fleet_get "$window" branch)"
    wt=""
    if [ -n "$branch" ]; then
      wt="$(git -C "$ROOT" worktree list --porcelain 2>/dev/null \
        | awk -v b="branch refs/heads/$branch" '/^worktree /{w=substr($0,10)} $0==b{print w; exit}')"
    fi
    resume+=$'\n'"## Worker $window: $label"$'\n\n'"- Conversation: \`$id\` (started in \`${cwd:-unknown}\`)"$'\n'
    resume+="- Branch: \`${branch:-unknown}\`"$'\n'"- Worktree: \`${wt:-none found}\`"$'\n'
    if [ -n "$wt" ] && [ -d "$wt" ]; then
      changes="$(git -C "$wt" status --porcelain 2>/dev/null || true)"
      if [ -n "$changes" ]; then
        resume+="- Uncommitted changes ($(printf '%s\n' "$changes" | wc -l) files):"$'\n'
        resume+="$(printf '%s\n' "$changes" | head -n 20 | sed 's/^/    /')"$'\n'
      else
        resume+="- Uncommitted changes: none"$'\n'
      fi
    fi
    # Claude keys transcripts by the directory it started in, so resume there.
    resume+="- Come back (in tmux window \`$FLEET_SESSION:$window\`, so the manager finds it):"$'\n'
    resume+="  \`cd '${cwd:-$ROOT}' && claude --dangerously-skip-permissions --remote-control '$FLEET_NAME-$window' --resume $id\`"$'\n'
  done
done < <(panes "${SESSIONS[@]}")

if [ "${#problems[@]}" -gt 0 ]; then
  echo "ABORTED: cannot make sure every conversation can be resumed; nothing was killed." >&2
  printf '  - %s\n' "${problems[@]}" >&2
  exit 1
fi

mapfile -t PIDS < <(collect_pids "${SESSIONS[@]}")
doc="# Fleet shutdown $STAMP"$'\n\n'"Sessions: ${SESSIONS[*]}. Bring the manager back first; it resumes the workers' work from .fleet/."$'\n'"$resume"

if [ "$DRY" = 1 ]; then
  echo "DRY RUN: nothing written, nothing killed."
  printf '%s\n' "$doc"
  echo
  echo "Would kill sessions ${SESSIONS[*]} and ${#PIDS[@]} process(es):"
  for pid in "${PIDS[@]}"; do echo "  $pid $(ps -o args= -p "$pid" 2>/dev/null | cut -c1-100)"; done
  exit 0
fi

mkdir -p "$OUT"
printf '%s\n' "$doc" > "$OUT/resume-$STAMP.md"
cp "$OUT/resume-$STAMP.md" "$(fleet_dir)/resume.md"
# resume-manager.sh resumes the id in this file, so it must name the running one.
[ -z "$manager_id" ] || echo "$manager_id" > "$(fleet_dir)/manager-session"
{
  for s in "${SESSIONS[@]}"; do echo "session $s"; done
  for pid in "${PIDS[@]}"; do st="$(start_time "$pid")"; [ -n "$st" ] && echo "pid $pid $st"; done
} > "$PID_FILE"
rm -f "$(fleet_dir)/shutdown-report.txt"
fleet_log "shutdown $STAMP planned: sessions ${SESSIONS[*]}, ${#PIDS[@]} processes"

printf '%s\n' "$doc"
echo
echo "Resume file: $(fleet_dir)/resume.md"
echo "Killing ${SESSIONS[*]} and ${#PIDS[@]} process(es) in ${DELAY}s from a detached process."
echo "Final report: $(fleet_dir)/shutdown-report.txt (last line starts with \"result:\")."
# Double fork plus setsid: the killer leaves this pane's process tree and its
# tmux variables, so killing the session does not take it down mid-way.
( env -u TMUX -u TMUX_PANE setsid nohup "$SCRIPT_DIR/fleet-shutdown.sh" --kill-step "$STAMP" \
    > "$OUT/kill-$STAMP.log" 2>&1 < /dev/null & )
exit 0
