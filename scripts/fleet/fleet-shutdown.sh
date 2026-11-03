#!/usr/bin/env bash
# Shut the fleet down so that it can come back: first make sure every Claude
# conversation in the fleet's tmux sessions can be resumed, then close those
# sessions, by default letting the work they started finish.
#
# Step 1, return. For every pane of the manager and fleet sessions the script
# finds the Claude processes in the pane's process tree and reads their
# conversation id from <claude dir>/sessions/<pid>.json (Claude Code writes it
# for each running process). It checks that the transcript <id>.jsonl exists,
# then writes a resume file to .fleet/shutdown/ (and .fleet/resume.md): the
# manager's id and command (resume-manager.sh), and for every worker its id,
# branch, worktree, uncommitted changes and the exact `claude --resume` command.
# A Claude process whose id or transcript cannot be found aborts everything:
# nothing is stopped.
#
# Step 2, stop. The manager usually runs this from inside its own tmux session,
# so the stopping runs as a detached process (setsid, outside every pane) after
# FLEET_SHUTDOWN_DELAY seconds, once the plan and the resume file are written.
# The processes concerned are the whole tree of every pane plus any process
# whose environment still names one of these panes (a job that left the tree).
#
# Default, gentle: panes are kept open (remain-on-exit) so their terminals do
# not hang up, Claude and the fleet guard get SIGTERM, and the remaining work
# (builds, tests, gates, detached jobs) may finish on its own for up to
# FLEET_SHUTDOWN_WAIT seconds. Idle daemons (FLEET_SHUTDOWN_IDLE: Gradle and
# Kotlin daemons, watchers, dev servers) are not work. When the work is done,
# the sessions are killed and the idle daemons get SIGTERM. Nothing gets
# SIGKILL: what is still alive after the wait is listed in the report and left
# running, and the sessions stay until a --force run.
#
# --force: SIGTERM to everything at once, kill the sessions, SIGKILL survivors
# after FLEET_SHUTDOWN_GRACE seconds.
#
# Both modes check every remembered PID again at the end. The report goes to
# .fleet/shutdown/report-*.txt and .fleet/shutdown-report.txt; its last line
# starts with "result:".
#
# Sessions: FLEET_MANAGER_SESSION and FLEET_SESSION (fleet.conf, environment
# wins), so tests run against dummy sessions. Only exact names match.
#
# Usage: fleet-shutdown.sh [--force] [--dry-run]
#   --force    kill whole process trees at once instead of letting work finish
#   --dry-run  print the plan (ids, commands, processes) and change nothing
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/fleet-lib.sh"

usage() { echo "usage: $0 [--force] [--dry-run]"; }

# The detached second step re-enters the script.
if [ "${1:-}" = "--kill-step" ]; then
  MODE=kill
  STAMP="$2"
  FORCE="$3"
else
  MODE=plan
  DRY=0
  FORCE=0
  for arg in "$@"; do
    case "$arg" in
      --dry-run) DRY=1 ;;
      --force) FORCE=1 ;;
      -h | --help) usage; exit 0 ;;
      *) usage >&2; exit 2 ;;
    esac
  done
  STAMP="$(date '+%Y%m%d-%H%M%S')"
fi

CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
DELAY="${FLEET_SHUTDOWN_DELAY:-5}"
GRACE="${FLEET_SHUTDOWN_GRACE:-5}"
WAIT="${FLEET_SHUTDOWN_WAIT:-1800}"
# Long-lived processes that never finish on their own (matched against the
# command line, extended regex); they and their children are not work to wait for.
IDLE="${FLEET_SHUTDOWN_IDLE:-GradleDaemon|KotlinCompileDaemon|kotlin-daemon|--watch|[ /]watch( |$)|nodemon|chokidar|vite( |$)|ng serve|nx serve|nx/src/daemon|-t serve|esbuild --service|playwright.*run-server|fleet-guard\.sh}"
GUARD='fleet-guard\.sh'
ROOT="$(fleet_root)"
OUT="$(fleet_dir)/shutdown"
PID_FILE="$OUT/pids-$STAMP"

# Start time of a process (field 22 of /proc/<pid>/stat), so a PID reused by an
# unrelated process after the snapshot is never touched. Empty when it is gone.
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

# Every live PID of the fleet: pane roots, their trees and environment matches,
# minus this process and its own children. Works after the panes are gone too,
# because the roots, pane ids and socket come from the plan.
scan_pids() {
  local socket="$1" ids="$2" roots="$3" self
  self=" $$ $(descendants $$ | tr '\n' ' ') "
  # shellcheck disable=SC2086
  { for r in $roots; do alive "$r" && echo "$r"; done; [ -z "${roots// /}" ] || descendants $roots; by_environment "$socket" "$ids"; } \
    | sort -un | while read -r pid; do
      case "$self" in *" $pid "*) continue ;; esac
      [ "$pid" -gt 1 ] && echo "$pid"
    done
}

# "<pid> <class>" for the given PIDs: claude (a conversation), guard (the fleet guard and its
# children), idle (an idle daemon or below one), root (a pane's own process,
# usually a shell) or work (everything else, to be waited for).
classify() {
  local roots="$1"; shift
  [ "$#" -gt 0 ] || return 0
  ps -e -o pid=,ppid=,comm=,args= | IDLE_RE="$IDLE" GUARD_RE="$GUARD" awk -v want=" $* " -v roots=" $roots " '
    {
      pid = $1; parent[pid] = $2; comm[pid] = $3
      line = $0; sub(/^ *[0-9]+ +[0-9]+ +[^ ]+ +/, "", line); args[pid] = line
    }
    function has(p, re,   q) {
      for (q = p; q in args && q > 1; q = parent[q]) if (args[q] ~ re) return 1
      return 0
    }
    END {
      idle = ENVIRON["IDLE_RE"]; guard = ENVIRON["GUARD_RE"]
      n = split(want, list, " ")
      for (i = 1; i <= n; i++) {
        p = list[i]
        if (!(p in args)) continue
        # A conversation is a claude process whose parent is not claude; one
        # below it (a fork, a subagent) belongs to its work.
        if (comm[p] == "claude" && comm[parent[p]] != "claude") c = "claude"
        else if (has(p, guard)) c = "guard"
        else if (has(p, idle)) c = "idle"
        else if (index(roots, " " p " ")) c = "root"
        else c = "work"
        print p, c
      }
    }'
}

session_field() {
  sed -n "s/.*\"$2\":\"\([^\"]*\)\".*/\1/p" "$1" | head -n 1
}

# ---------------------------------------------------------------- stop step
if [ "$MODE" = kill ]; then
  sleep "$DELAY"
  report="$OUT/report-$STAMP.txt"
  sessions=()
  while read -r s; do [ -n "$s" ] && sessions+=("$s"); done < <(sed -n 's/^session //p' "$PID_FILE")
  socket="$(sed -n 's/^socket //p' "$PID_FILE")"
  ids="$(sed -n 's/^pane \([^ ]*\) .*/\1/p' "$PID_FILE" | tr '\n' ' ')"
  roots="$(sed -n 's/^pane [^ ]* \([0-9]*\)$/\1/p' "$PID_FILE" | tr '\n' ' ')"
  live=()
  for s in "${sessions[@]}"; do tmux has-session -t "=$s" 2>/dev/null && live+=("$s"); done

  # The remembered PIDs (still the same processes) plus anything started since.
  declare -A want=()
  refresh() {
    local pid
    while read -r pid; do
      [ -n "${want[$pid]+x}" ] || want[$pid]="$(start_time "$pid")"
    done < <(scan_pids "$socket" "$ids" "$roots")
  }
  while read -r pid st; do alive "$pid" "$st" && want[$pid]="$st"; done < <(sed -n 's/^pid //p' "$PID_FILE")
  refresh
  living() {
    local pid
    for pid in "${!want[@]}"; do alive "$pid" "${want[$pid]}" && echo "$pid"; done
    return 0
  }
  describe() { echo "pid $1 $(ps -o args= -p "$1" 2>/dev/null | cut -c1-120)"; }

  {
    echo "fleet shutdown $STAMP ($([ "$FORCE" = 1 ] && echo force || echo gentle))"
    echo "sessions: ${sessions[*]}"
    echo "processes found: ${#want[@]}"
  } > "$report"

  failed=0
  kept_sessions=0
  if [ "$FORCE" = 1 ]; then
    for pid in "${!want[@]}"; do kill -TERM "$pid" 2>/dev/null || true; done
    for s in "${live[@]}"; do tmux kill-session -t "=$s" 2>/dev/null || true; done
    for _ in $(seq 1 $((GRACE * 5))); do
      [ -z "$(living)" ] && break
      sleep 0.2
    done
    refresh
    killed=0
    for pid in $(living); do kill -KILL "$pid" 2>/dev/null || true; killed=$((killed + 1)); done
    sleep 1
    echo "SIGKILL needed: $killed" >> "$report"
    for pid in $(living); do
      echo "NOT KILLED: $(describe "$pid")" >> "$report"
      failed=$((failed + 1))
    done
  else
    # A dead pane keeps its terminal, so the work in it gets no hangup.
    for s in "${live[@]}"; do
      tmux list-windows -t "=$s" -F '#{window_id}' 2>/dev/null | while read -r w; do
        tmux set-option -w -t "$w" remain-on-exit on 2>/dev/null || true
      done
    done
    # shellcheck disable=SC2046
    while read -r pid class; do
      case "$class" in claude | guard) kill -TERM "$pid" 2>/dev/null || true ;; esac
    done < <(classify "$roots" $(living))
    waited=0
    work=""
    while :; do
      sleep 1
      waited=$((waited + 1))
      refresh
      # shellcheck disable=SC2046
      work="$(classify "$roots" $(living) | awk '$2 == "work" || $2 == "claude" {print $1}')"
      [ -z "$work" ] && break
      [ "$waited" -lt "$WAIT" ] || break
    done
    echo "waited for work: ${waited}s of ${WAIT}s" >> "$report"
    if [ -n "$work" ]; then
      for pid in $work; do echo "STILL RUNNING (left alone): $(describe "$pid")" >> "$report"; done
      failed=$(printf '%s\n' "$work" | wc -l)
      kept_sessions=1
      echo "kept: tmux sessions ${live[*]} and idle daemons, so the work above is not cut off" >> "$report"
    else
      for s in "${live[@]}"; do tmux kill-session -t "=$s" 2>/dev/null || true; done
      sleep 0.5
      refresh
      for pid in $(living); do kill -TERM "$pid" 2>/dev/null || true; done
      for _ in $(seq 1 $((GRACE * 5))); do
        [ -z "$(living)" ] && break
        sleep 0.2
      done
      for pid in $(living); do
        echo "NOT STOPPED (left alone): $(describe "$pid")" >> "$report"
        failed=$((failed + 1))
      done
    fi
  fi
  if [ "$kept_sessions" = 0 ]; then
    for s in "${sessions[@]}"; do
      if tmux has-session -t "=$s" 2>/dev/null; then
        echo "NOT CLOSED: tmux session $s" >> "$report"
        failed=$((failed + 1))
      fi
    done
  fi
  if [ "$failed" = 0 ]; then
    echo "result: ok, sessions gone and no remembered process survives" >> "$report"
  elif [ "$kept_sessions" = 1 ]; then
    echo "result: WAITING, $failed process(es) still working after ${WAIT}s; left running, run again with --force to kill" >> "$report"
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
declare -A COMM=() PARENT=()
while read -r pid ppid comm; do COMM[$pid]="$comm"; PARENT[$pid]="$ppid"; done < <(ps -e -o pid=,ppid=,comm=)

manager_id=""
saved_id="$(cat "$(fleet_dir)/manager-session" 2>/dev/null || true)"

while read -r pane_id pane_pid session window; do
  tree="$pane_pid $(descendants "$pane_pid" | tr '\n' ' ')"
  claudes=()
  # A claude process below another one is its fork or subagent, not a conversation.
  for pid in $tree; do
    [ "${COMM[$pid]:-}" = claude ] && [ "${COMM[${PARENT[$pid]:-0}]:-}" != claude ] && claudes+=("$pid")
  done
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
  echo "ABORTED: cannot make sure every conversation can be resumed; nothing was stopped." >&2
  printf '  - %s\n' "${problems[@]}" >&2
  exit 1
fi

SOCKET="$(tmux display-message -p -t "=${SESSIONS[0]}" '#{socket_path}' 2>/dev/null || true)"
PANE_IDS="$(panes "${SESSIONS[@]}" | awk '{print $1}' | tr '\n' ' ')"
PANE_ROOTS="$(panes "${SESSIONS[@]}" | awk '{print $2}' | tr '\n' ' ')"
mapfile -t PIDS < <(scan_pids "$SOCKET" "$PANE_IDS" "$PANE_ROOTS")
if [ "$FORCE" = 1 ]; then
  how="force: kill whole process trees at once, SIGKILL survivors after ${GRACE}s"
else
  how="gentle: SIGTERM to Claude and the guard, let work finish for up to ${WAIT}s, then close the sessions and stop idle daemons; nothing gets SIGKILL"
fi
doc="# Fleet shutdown $STAMP"$'\n\n'"Sessions: ${SESSIONS[*]}. Mode: $how."$'\n'"Bring the manager back first; it resumes the workers' work from .fleet/."$'\n'"$resume"

if [ "$DRY" = 1 ]; then
  echo "DRY RUN: nothing written, nothing stopped."
  printf '%s\n' "$doc"
  echo
  echo "Would stop sessions ${SESSIONS[*]} and ${#PIDS[@]} process(es) (class: claude, guard, idle, root, work):"
  # shellcheck disable=SC2068
  classify "$PANE_ROOTS" ${PIDS[@]} | while read -r pid class; do
    echo "  $pid $class $(ps -o args= -p "$pid" 2>/dev/null | cut -c1-100)"
  done
  exit 0
fi

mkdir -p "$OUT"
printf '%s\n' "$doc" > "$OUT/resume-$STAMP.md"
cp "$OUT/resume-$STAMP.md" "$(fleet_dir)/resume.md"
# resume-manager.sh resumes the id in this file, so it must name the running one.
[ -z "$manager_id" ] || echo "$manager_id" > "$(fleet_dir)/manager-session"
{
  for s in "${SESSIONS[@]}"; do echo "session $s"; done
  echo "socket $SOCKET"
  panes "${SESSIONS[@]}" | awk '{print "pane", $1, $2}'
  for pid in "${PIDS[@]}"; do st="$(start_time "$pid")"; [ -n "$st" ] && echo "pid $pid $st"; done
} > "$PID_FILE"
rm -f "$(fleet_dir)/shutdown-report.txt"
fleet_log "shutdown $STAMP planned ($([ "$FORCE" = 1 ] && echo force || echo gentle)): sessions ${SESSIONS[*]}, ${#PIDS[@]} processes"

printf '%s\n' "$doc"
echo
echo "Resume file: $(fleet_dir)/resume.md"
echo "Stopping ${SESSIONS[*]} and ${#PIDS[@]} process(es) in ${DELAY}s from a detached process."
echo "Final report: $(fleet_dir)/shutdown-report.txt (last line starts with \"result:\")."
# Double fork plus setsid: the stopper leaves this pane's process tree and its
# tmux variables, so closing the session does not take it down mid-way.
( env -u TMUX -u TMUX_PANE setsid nohup "$SCRIPT_DIR/fleet-shutdown.sh" --kill-step "$STAMP" "$FORCE" \
    > "$OUT/kill-$STAMP.log" 2>&1 < /dev/null & )
exit 0
