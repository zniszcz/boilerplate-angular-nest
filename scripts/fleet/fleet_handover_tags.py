"""Parser of the {handover <group>.<order> <who>} tags in *.todo.md, shared by
fleet-handover.sh render and summary.

The order after the dot is a plain integer with any number of digits: 1.05, 1.99,
1.100 and 1.1000 are all valid and sort numerically (1.99 before 1.100). Leading
zeros carry no meaning, so 1.5 and 1.05 are the same position and reported as a
duplicate.
"""
import glob
import os
import re

TAG = re.compile(r'^(?P<ind>\s*)- \[(?P<x>[ x])\] (?P<body>.*?)\s*\{handover (?P<nr>\d+\.\d+) (?P<who>me|you|both)(?P<doing> doing)?\}\s*$')
WHO_KEY = {"me": "me", "you": "you", "both": "both"}


def nr_key(nr):
    """Numeric sort key of a tag number: "1.100" -> (1, 100)."""
    group, order = nr.split(".")
    return int(group), int(order)


def group_of(nr):
    """The group of a tag number as a string: "1.100" -> "1"."""
    return str(nr_key(nr)[0])


def parse(root):
    """Return (items sorted numerically, warnings) for every *.todo.md in root."""
    items, warn, seen = [], [], {}
    for path in sorted(glob.glob(os.path.join(root, "*.todo.md"))):
        name = os.path.basename(path)
        with open(path) as f:
            lines = f.read().split("\n")
        for n, line in enumerate(lines, 1):
            if "{handover" not in line or line.lstrip().startswith(("Handover list", "#")) or "`{handover" in line:
                continue
            m = TAG.match(line)
            if not m:
                warn.append(f"{name}:{n} broken tag"); continue
            nr = m["nr"]
            key = nr_key(nr)
            if key in seen:
                warn.append(f"{name}:{n} duplicate {nr} (also {seen[key]})")
            seen[key] = f"{name}:{n}"
            title, _, outcome = m["body"].partition(" — ")
            status = "done" if m["x"] == "x" else ("doing" if m["doing"] else "todo")
            items.append({"nr": nr, "title": title, "outcome": outcome, "who": WHO_KEY[m["who"]], "status": status})
        # a ticked tagged child under an unticked parent: is the parent finished?
        for n, line in enumerate(lines):
            pm = re.match(r'^(\s*)- \[ \] ', line)
            if not pm: continue
            ind = len(pm[1]); kids = []
            for l in lines[n+1:]:
                if l.strip() and len(l) - len(l.lstrip()) <= ind: break
                km = TAG.match(l)
                if km: kids.append(km["x"] == "x")
            if kids and all(kids):
                warn.append(f"{name}:{n+1} every tagged sub-item is done; tick the parent too")
    items.sort(key=lambda i: nr_key(i["nr"]))
    return items, warn
