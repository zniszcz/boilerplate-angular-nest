#!/usr/bin/env bash
# The human's handover checklist, rendered from the *.todo.md files themselves.
#
#   fleet-handover.sh render              writes .fleet/handover/index.html
#   fleet-handover.sh set <nr> <status>   status: todo | doing | done; edits the todo line, then renders
#   fleet-handover.sh summary             open items in order, plus warnings
#
# The todo lists stay the only source of truth. An item takes part when its
# line ends with a tag:
#
#   - [ ] Title — outcome. {handover 1.05 me}
#   - [ ] Title — outcome. {handover 1.01 me doing}
#
# <group>.<order>, each part any number of digits, sorted numerically (1.99
# before 1.100; parser in fleet_handover_tags.py): group 1 my queue, 2 the human's and joint, 3 mine after theirs,
# 0 done before the list existed; the number is the execution order and must
# be unique. Who: me (the fleet) | you (the human) | both. A broken tag or a duplicate number is a loud
# warning, never a silently missing row.
#
# The page is published by the manager with the Artifact tool, file
# .fleet/handover/index.html, url from .fleet/handover-url.
source "$(dirname "$0")/fleet-lib.sh"
ROOT="$(fleet_root)"
SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
OUT="$ROOT/.fleet/handover/index.html"
# *.todo.md are read from the root of the main checkout (fleet_root), never from a worktree.
TITLE="${FLEET_HANDOVER_TITLE:-Handover: $(basename "$ROOT")}"

render() {
  mkdir -p "$(dirname "$OUT")"
  ROOT="$ROOT" SCRIPTS="$SCRIPTS" TITLE="$TITLE" python3 - "$OUT" <<'PY'
import json, sys, html, datetime, re, glob, os
ROOT = os.environ["ROOT"]
sys.path.insert(0, os.environ["SCRIPTS"])
from fleet_handover_tags import parse, group_of
items, warn = parse(ROOT)
GROUPS = {"1": ("My queue", "I take them in order, without waiting for you"),
          "2": ("Yours and shared", "yours in any order, shared tests after my queue"),
          "3": ("Mine after yours", "each waits for an item of part two")}
data = {"title": os.environ["TITLE"],
        "lead": "Everything left to do. This page reads the task lists in the repository; tick items there, not here.",
        "groups": [{"title": t, "note": note, "items": [i for i in items if group_of(i["nr"]) == g]} for g, (t, note) in GROUPS.items()]}
data["groups"].append({"title": "_done0", "note": "", "items": [i for i in items if group_of(i["nr"]) == "0"]})
for w in warn: print("WARN", w, file=sys.stderr)
e = html.escape
WHO = {"me": ("me", "me"), "you": ("you", "you"), "both": ("both", "both")}
STATUS = {"doing": '<span class="st">doing</span>'}
open_items = [i for g in data["groups"] for i in g["items"] if i["status"] != "done"]
waiting = [i for i in open_items if i["who"] in ("you", "both")]
doing = [i for i in open_items if i["status"] == "doing"]
done_all = [i for g in data["groups"] for i in g["items"] if i["status"] == "done"]
total = len(open_items) + len(done_all)
now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

def li(i, done=False):
    cls, label = WHO[i["who"]]
    st = STATUS.get(i["status"], "")
    return (f'<li class="{"done" if done else i["status"]}"><span class="box" aria-hidden="true"></span>'
            f'<div><span class="t">{e(i["title"])}<span class="who {cls}">{label}</span>{st}</span>'
            f'<span class="d">{e(i["outcome"])}</span></div></li>')

parts = []
for n, g in enumerate([g for g in data["groups"] if g["title"] != "_done0"], 1):
    items = [i for i in g["items"] if i["status"] != "done"]
    if not items:
        continue
    note = f' <small>{e(g["note"])}</small>' if g.get("note") else ""
    parts.append(f'<section><h2>{n}. {e(g["title"])}{note}</h2><ol>{"".join(li(i) for i in items)}</ol></section>')
if done_all:
    parts.append(f'<section class="donegrp"><h2>Done</h2><ol>{"".join(li(i, True) for i in done_all)}</ol></section>')

wait_line = (f'{len(waiting)} of {len(open_items)} open items wait for you.' if waiting
             else 'Nothing waits for you.')
doing_line = ('In progress: ' + ', '.join(e(i["title"]) for i in doing) + '.') if doing else 'Nothing is in progress.'

page = f'''<!DOCTYPE html>
<title>{e(data["title"])}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&family=Source+Sans+3:wght@400;600&display=swap">
<style>
/* Layout: one narrow column; status summary on top, numbered queues in execution order, done block last. */
:root{{--bg:#f6f3ef;--surface:#fffdfa;--fg:#2a2220;--muted:#6f625d;--line:#e2d9d2;--accent:#8a3b3a;--ok:#2f6b47;--me:#3d5a80;--you:#8a3b3a;--both:#7a5c1e;--doing:#b4690e;
--display:"Fraunces",Georgia,serif;--body:"Source Sans 3",system-ui,sans-serif}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#1b1716;--surface:#241f1d;--fg:#efe6e0;--muted:#a8988f;--line:#3a312d;--accent:#d98c86;--ok:#7cc59a;--me:#9db8dc;--you:#d98c86;--both:#d8b56b;--doing:#f0b35e;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#1b1716;--surface:#241f1d;--fg:#efe6e0;--muted:#a8988f;--line:#3a312d;--accent:#d98c86;--ok:#7cc59a;--me:#9db8dc;--you:#d98c86;--both:#d8b56b;--doing:#f0b35e;color-scheme:dark}}
body{{background:var(--bg);color:var(--fg);font:16px/1.5 var(--body)}}
.wrap{{max-width:46rem;margin:0 auto;padding-block:28px 56px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:grid;gap:28px}}
h1{{font:650 clamp(1.6rem,4vw,2.2rem)/1.15 var(--display);margin:0;text-wrap:balance}}
.lead{{color:var(--muted);margin:6px 0 0}}
.status{{display:grid;gap:8px;padding:14px 16px;border:1px solid var(--line);border-radius:8px;background:var(--surface)}}
.status .big{{font-weight:600;font-size:1.05rem}}
.status .small{{color:var(--muted);font-size:.9rem}}
.bar{{height:8px;border-radius:4px;background:var(--line);overflow:hidden}}
.bar i{{display:block;height:100%;background:var(--ok)}}
.legend{{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:.85rem;color:var(--muted)}}
section{{display:grid;gap:10px}}
h2{{font:600 1.15rem/1.3 var(--display);margin:0}}
h2 small{{font:400 .85rem var(--body);color:var(--muted);margin-left:6px}}
ol{{list-style:none;counter-reset:n;margin:0;padding:0;border:1px solid var(--line);border-radius:8px;background:var(--surface)}}
li{{counter-increment:n;display:grid;grid-template-columns:2ch 20px 1fr;gap:10px;padding:12px 14px;border-top:1px solid var(--line)}}
li:first-child{{border-top:0}}
li::before{{content:counter(n);color:var(--muted);font-variant-numeric:tabular-nums;text-align:right}}
.donegrp li::before{{content:""}}
li>div{{min-width:0}}
.box{{width:18px;height:18px;margin-top:3px;border:2px solid var(--line);border-radius:4px}}
li.doing .box{{border-color:var(--doing)}}
li.done .box{{background:var(--ok);border-color:var(--ok)}}
.t{{font-weight:600}}
.d{{color:var(--muted);font-size:.92rem;display:block;margin-top:2px}}
.who,.st{{display:inline-block;font-size:.72rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:1px 7px;border-radius:999px;border:1px solid currentColor;margin-left:6px;vertical-align:1px}}
.who.me{{color:var(--me)}}.who.you{{color:var(--you)}}.who.both{{color:var(--both)}}.st{{color:var(--doing)}}
li.done .t,li.done .d{{opacity:.55}}
li.done .t{{text-decoration:line-through}}
</style>
<div class="wrap">
<header><h1>{e(data["title"])}</h1><p class="lead">{e(data["lead"])}</p></header>
<div class="status">
<div class="big">{wait_line}</div>
<div class="small">{doing_line}</div>
<div class="bar"><i style="width:{100*len(done_all)/max(total,1):.0f}%"></i></div>
<div class="small">Done {len(done_all)} of {total}. Updated {now}.</div>
<div class="legend"><span><span class="who me">me</span> the fleet does it</span><span><span class="who both">both</span> we work together</span><span><span class="who you">you</span> information or access only you have</span></div>
</div>
{"".join(parts)}
</div>'''
open(sys.argv[1], "w").write(page)
PY
  echo "rendered $OUT"
}

set_status() {
  local nr="$1" st="$2"
  mkdir -p "$ROOT/.fleet/todo-backup"
  cp "$ROOT"/*.todo.md "$ROOT/.fleet/todo-backup/"
  ROOT="$ROOT" SCRIPTS="$SCRIPTS" python3 - "$nr" "$st" <<'PY'
import glob, os, re, sys
nr, st = sys.argv[1:]
assert st in ("todo", "doing", "done"), st
hits = []
for path in glob.glob(os.path.join(os.environ["ROOT"], "*.todo.md")):
    lines = open(path).read().split("\n")
    for i, l in enumerate(lines):
        if re.search(r"\{handover " + re.escape(nr) + r" ", l):
            hits.append((path, lines, i))
if len(hits) != 1: sys.exit(f"{nr}: {len(hits)} lines carry it")
path, lines, i = hits[0]
before = len(lines)
l = re.sub(r" doing\}", "}", lines[i])
l = re.sub(r"- \[[ x]\]", "- [x]" if st == "done" else "- [ ]", l, count=1)
if st == "doing": l = l[:l.rindex("}")] + " doing}"
lines[i] = l
open(path, "w").write("\n".join(lines))
assert len(open(path).read().split("\n")) == before, "line count changed"
print(os.path.basename(path), l.strip())
PY
}

case "${1:-}" in
  render) render ;;
  set)
    [ $# -eq 3 ] || { echo "usage: $0 set <nr> todo|doing|done" >&2; exit 2; }
    set_status "$2" "$3"
    render ;;
  summary)
    ROOT="$ROOT" SCRIPTS="$SCRIPTS" python3 - <<'PY'
import json, sys, html, datetime, re, glob, os
ROOT = os.environ["ROOT"]
sys.path.insert(0, os.environ["SCRIPTS"])
from fleet_handover_tags import parse, group_of
items, warn = parse(ROOT)
for i in items:
    if i["status"] != "done":
        print(f'{i["nr"]} {i["status"]:5} {i["who"]:4} {i["title"]}')
for w in warn: print("WARN", w)
PY
    ;;
  *) echo "usage: $0 render | set <nr> <status> | summary" >&2; exit 2 ;;
esac
