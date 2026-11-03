"""The guard's event wake-up, fleet-reap.sh and the audit's waiting check.

Run: python3 -m unittest discover -s scripts/fleet/tests
"""
import shutil
import subprocess
import time
import unittest
from pathlib import Path

from test_fleet_cleanup import Fleet, SCRIPTS, git

# A pane in files: $PANE/screen is the text, $PANE/input the prompt line. Typing
# goes to the prompt, Enter submits it and logs it to $PANE/sent. Fleet workers
# live in $TMUX_WINDOWS with their own screen in $PANE/<window>.
TMUX_STUB = r"""#!/usr/bin/env bash
cmd="$1"; shift
case "$cmd" in
  has-session) exit 0 ;;
  list-windows) cat "$TMUX_WINDOWS" 2>/dev/null ;;
  display*) echo "${TMUX_PANE_RESULT:-50}" ;;
  capture-pane)
    while [ $# -gt 0 ]; do [ "$1" = -t ] && t="$2"; shift; done
    case "$t" in
      test-fleet:*) cat "$PANE/${t#test-fleet:}" 2>/dev/null ;;
      *)
        cat "$PANE/screen"
        echo "──────────"
        echo "❯ $(cat "$PANE/input" 2>/dev/null)"
        echo "──────────"
        # capture-pane pads the pane: the prompt floats above empty rows.
        printf '\n%.0s' 1 2 3 4 5 6 7 8 9 10
        ;;
    esac
    ;;
  send-keys)
    [ "$1" = -t ] && shift 2
    case "$1" in
      -l) printf '%s' "$2" >> "$PANE/input" ;;
      C-u) ${GUARD_TEST_KEEP_INPUT:+true} : > "$PANE/input" ;;
      Enter)
        if [ -z "${GUARD_TEST_EAT_ENTER:-}" ]; then
          cat "$PANE/input" >> "$PANE/sent"; echo >> "$PANE/sent"; : > "$PANE/input"
        fi
        ;;
    esac
    ;;
esac
exit 0
"""

# No waiting in tests; the requested lengths are logged for the 30 s check.
SLEEP_STUB = """#!/usr/bin/env bash
echo "$1" >> "$PANE/sleeps"
"""

# $GH_MERGED as in the cleanup tests; $GH_OPEN/<branch> holds open PR numbers.
# `gh pr view <n>` prints $GH_PR/<n> ("STATE oid"); $GH_NO_BRANCH makes every
# lookup by branch fail, as after the remote branch was deleted.
GH_STUB = r"""#!/usr/bin/env bash
[ -e "$GH_FAIL" ] && exit 1
if [ "$1 $2" = "pr view" ]; then cat "$GH_PR/$3" 2>/dev/null || exit 1; exit 0; fi
[ -e "$GH_NO_BRANCH" ] && exit 1
while [ $# -gt 0 ]; do
  case "$1" in --head) branch="$2" ;; --state) state="$2" ;; --base) echo '[]' ;; esac
  shift
done
[ -n "${branch:-}" ] || exit 0
case "$state" in
  merged) cat "$GH_MERGED/${branch//\//-}" 2>/dev/null ;;
  open) cat "$GH_OPEN/${branch//\//-}" 2>/dev/null ;;
esac
exit 0
"""


class Events(Fleet):
    def setUp(self):
        super().setUp()
        bin_dir = self.base / "bin"
        self.pane = self.base / "pane"
        self.open = self.base / "open"
        self.pane.mkdir()
        self.open.mkdir()
        for name, body in (("tmux", TMUX_STUB), ("sleep", SLEEP_STUB), ("gh", GH_STUB)):
            (bin_dir / name).write_text(body)
            (bin_dir / name).chmod(0o755)
        (self.pane / "screen").write_text("manager waits\n")
        self.env.update(
            PANE=str(self.pane), GH_OPEN=str(self.open), GH_FAIL=str(self.base / "gh-fail"),
            GH_PR=str(self.base / "prs"), GH_NO_BRANCH=str(self.base / "gh-no-branch"),
            HOME=str(self.base), GUARD_SECONDS="600",
        )

    def report(self, worker, *args):
        self.run_script_args("fleet-report.sh", "--worker", worker, *args)

    def run_script_args(self, name, *args):
        result = subprocess.run(
            [str(self.scripts / name), *args], env=self.env, capture_output=True, text=True, timeout=60,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def guard(self, looks=2, **env):
        self.env["GUARD_MAX_LOOKS"] = str(looks)
        self.env.update(env)
        return self.run_script_args("fleet-guard.sh", "test-manager")

    def wakes(self):
        sent = self.pane / "sent"
        return sent.read_text().split() if sent.exists() else []

    def events_left(self):
        return [p.name for p in self.fleet.glob("events*") if p.read_text()]


class EventWake(Events):
    def test_each_event_status_wakes_on_the_second_look(self):
        for status in ("review", "ready-to-merge", "blocked", "asking", "done"):
            with self.subTest(status):
                (self.pane / "sent").unlink(missing_ok=True)
                self.report("w", "--status", "working")
                self.report("w", "--status", status)
                self.guard()
                self.assertEqual(self.wakes(), ["/manage-fleet"])
                self.assertEqual(self.events_left(), [])

    def test_question_wakes_and_its_text_stays_for_the_manager(self):
        self.report("w", "--ask", "A or B?")
        self.guard()
        self.assertEqual(self.wakes(), ["/manage-fleet"])
        self.assertIn("A or B?", (self.fleet / "workers/w.ask").read_text())

    def test_working_does_not_wake(self):
        self.report("w", "--status", "starting")
        self.report("w", "--status", "working")
        self.guard(looks=5)
        self.assertEqual(self.wakes(), [])

    def test_opening_a_pull_request_wakes_the_manager(self):
        self.report("w", "--status", "working")
        self.report("w", "--pr", "https://github.com/x/y/pull/1", "--status", "review")
        self.guard()
        self.assertEqual(self.wakes(), ["/manage-fleet"])

    def test_reporting_review_again_after_a_fix_does_not_wake(self):
        self.report("w", "--status", "review")
        self.guard()
        self.report("w", "--status", "review", "--note", "naprawione")
        self.guard(looks=5)
        self.assertEqual(self.wakes(), ["/manage-fleet"])

    def test_repeating_a_status_wakes_once(self):
        self.report("w", "--status", "blocked")
        self.report("w", "--status", "blocked", "--note", "nadal")
        self.guard(looks=5)
        self.assertEqual(self.wakes(), ["/manage-fleet"])

    def test_status_coming_back_wakes_again(self):
        self.report("w", "--status", "blocked")
        self.guard()
        self.report("w", "--status", "working")
        self.report("w", "--status", "blocked")
        self.guard()
        self.assertEqual(self.wakes(), ["/manage-fleet", "/manage-fleet"])

    def test_looks_at_most_every_thirty_seconds(self):
        self.report("w", "--status", "blocked")
        self.guard(looks=4)
        sleeps = (self.pane / "sleeps").read_text().split()
        self.assertGreaterEqual(sleeps.count("30"), 4)
        self.assertEqual([s for s in sleeps if int(s) < 30 and s not in ("1", "2", "5")], [])


class EventNotLost(Events):
    def test_busy_manager_keeps_the_event_until_it_is_free(self):
        self.report("w", "--status", "ready-to-merge")
        (self.pane / "screen").write_text("thinking… esc to interrupt\n")
        self.guard(looks=4)
        self.assertEqual(self.wakes(), [])
        self.assertTrue(self.events_left())
        (self.pane / "screen").write_text("manager waits\n")
        self.guard()
        self.assertEqual(self.wakes(), ["/manage-fleet"])
        self.assertEqual(self.events_left(), [])

    def test_unsent_text_is_not_touched_and_the_event_waits(self):
        self.report("w", "--status", "blocked")
        (self.pane / "input").write_text("pisze do managera")
        self.guard(looks=4)
        self.assertEqual((self.pane / "input").read_text(), "pisze do managera")
        self.assertEqual(self.wakes(), [])
        self.assertTrue(self.events_left())
        (self.pane / "input").write_text("")
        self.guard()
        self.assertEqual(self.wakes(), ["/manage-fleet"])

    def test_failed_wake_up_keeps_the_event(self):
        self.report("w", "--status", "blocked")
        self.guard(GUARD_TEST_EAT_ENTER="1")
        self.assertEqual(self.wakes(), [])
        self.assertTrue(self.events_left())
        del self.env["GUARD_TEST_EAT_ENTER"]
        self.guard()
        self.assertEqual(self.wakes(), ["/manage-fleet"])
        self.assertEqual(self.events_left(), [])

    def test_event_from_while_the_guard_was_down_wakes_after_start(self):
        self.report("w", "--status", "done")
        self.guard(looks=1)
        self.assertEqual(self.wakes(), [])
        self.guard()
        self.assertEqual(self.wakes(), ["/manage-fleet"])

    def test_worker_moving_on_does_not_cancel_the_event(self):
        self.report("w", "--status", "blocked")
        self.report("w", "--status", "working")
        self.guard()
        self.assertEqual(self.wakes(), ["/manage-fleet"])

    def test_report_during_delivery_is_kept_for_the_next_wake_up(self):
        (self.fleet / "events.delivering").write_text("2026-01-01 10:00:00 a blocked\n")
        self.report("b", "--status", "done")
        self.guard(GUARD_TEST_EAT_ENTER="1")
        self.assertEqual(sorted(self.events_left()), ["events", "events.delivering"])
        del self.env["GUARD_TEST_EAT_ENTER"]
        self.guard(looks=4)
        self.assertEqual(self.events_left(), [])


class IdleWake(Events):
    def test_quiet_pane_wakes_after_the_interval_only(self):
        self.guard(looks=20)  # 19 still looks of 30 s, under 600 s
        self.assertEqual(self.wakes(), [])
        self.guard(looks=22)
        self.assertEqual(self.wakes(), ["/manage-fleet"])

    def test_guard_survives_a_failing_tmux(self):
        (self.base / "bin/tmux").write_text("#!/usr/bin/env bash\nexit 1\n")
        out = self.guard(looks=3)
        self.assertIn("stop", out.splitlines()[-1])


class Reap(Events):
    def setUp(self):
        super().setUp()
        self.env["FLEET_SESSION"] = "test-fleet"

    def finished(self, slug="job", status="done", merged=True, window=False):
        wt = self.worktree(slug, merged=merged)
        name = f"feat-{slug}"
        self.worker(name, status)
        with (self.fleet / f"workers/{name}.env").open("a") as f:
            f.write(f"branch=feat/{slug}\n")
        if window:
            self.windows.write_text(f"{name}\n")
            (self.pane / name).write_text("idle\n")
        return wt, name

    def reap(self):
        return self.run_script_args("fleet-reap.sh")

    def assert_removed(self, wt, name):
        self.assertFalse(wt.exists())
        self.assertFalse((self.fleet / f"workers/{name}.env").exists())
        self.assertTrue((self.fleet / f"workers-archive/{name}.env").exists())

    def assert_kept(self, wt, name):
        self.assertTrue(wt.exists())
        self.assertTrue((self.fleet / f"workers/{name}.env").exists())

    def test_merged_clean_worker_is_removed_and_archived(self):
        for status in ("merged", "done"):
            with self.subTest(status):
                wt, name = self.finished(slug=f"z{status}", status=status)
                self.assertIn("removed", self.reap())
                self.assert_removed(wt, name)

    def test_uncommitted_work_stays_and_is_reported(self):
        wt, name = self.finished()
        (wt / "new.txt").write_text("work")
        self.assertIn("uncommitted work", self.reap())
        self.assert_kept(wt, name)
        self.assertEqual((wt / "new.txt").read_text(), "work")
        self.assertIn("CLEANUP HELD", self.audit())

    def test_commits_after_the_merge_stay_and_are_reported(self):
        wt, name = self.finished()
        (wt / "po.txt").write_text("po")
        git(wt, "add", ".")
        git(wt, "commit", "-q", "-m", "after")
        self.assertIn("commits after the merge", self.reap())
        self.assert_kept(wt, name)

    def test_held_worker_keeps_its_window_and_status(self):
        wt, name = self.finished(window=True)
        (wt / "new.txt").write_text("work")
        self.reap()
        self.assertIn(name, self.windows.read_text())
        self.assertIn("status=done", (self.fleet / f"workers/{name}.env").read_text())

    def test_open_pr_stays_even_with_a_merged_one(self):
        wt, name = self.finished(window=True)
        (self.open / "feat-job").write_text("77\n")
        self.assertIn("open PR #77", self.reap())
        self.assert_kept(wt, name)
        self.assertIn("status=done", (self.fleet / f"workers/{name}.env").read_text())

    def with_pr(self, name, state, number=71):
        (self.base / "gh-no-branch").touch()
        (self.base / "prs").mkdir(exist_ok=True)
        oid = (self.merged / "feat-job").read_text().strip()
        (self.base / f"prs/{number}").write_text(f"{state} {oid}\n")
        with (self.fleet / f"workers/{name}.env").open("a") as f:
            f.write(f"pr=https://github.com/x/y/pull/{number}\n")

    def test_deleted_branch_merged_pr_is_found_by_number(self):
        wt, name = self.finished()
        self.with_pr(name, "MERGED")
        self.assertIn("removed", self.reap())
        self.assert_removed(wt, name)

    def test_deleted_branch_open_pr_by_number_stays(self):
        wt, name = self.finished()
        self.with_pr(name, "OPEN")
        self.assertIn("open PR #71", self.reap())
        self.assert_kept(wt, name)

    def test_deleted_branch_without_pr_number_is_reported(self):
        wt, name = self.finished()
        (self.base / "gh-no-branch").touch()
        self.assertIn("cannot read the state of the PR of branch", self.reap())
        self.assert_kept(wt, name)

    def test_unmerged_finished_worker_is_silently_left(self):
        wt, name = self.finished(merged=False)
        self.assertEqual(self.reap(), "")
        self.assert_kept(wt, name)

    def test_unfinished_status_stays_despite_the_merge(self):
        for status in ("working", "review", "ready-to-merge", "asking", "blocked"):
            with self.subTest(status):
                wt, name = self.finished(slug=f"z{status.replace('-', '')}", status=status)
                self.reap()
                self.assert_kept(wt, name)

    def test_mid_turn_worker_waits_for_the_next_run(self):
        wt, name = self.finished(window=True)
        (self.pane / name).write_text("esc to interrupt\n")
        self.assertEqual(self.reap(), "")
        self.assert_kept(wt, name)

    def test_unsent_text_in_the_worker_stays(self):
        wt, name = self.finished(window=True)
        (self.pane / name).write_text("❯ a new instruction\n")
        self.assertIn("unsent text", self.reap())
        self.assert_kept(wt, name)

    def test_unknown_pr_state_keeps_everything(self):
        wt, name = self.finished()
        (self.base / "gh-fail").write_text("")
        self.assertIn("cannot", self.reap())
        self.assert_kept(wt, name)

    def test_a_reason_is_printed_once_and_clears_when_resolved(self):
        wt, name = self.finished()
        (wt / "new.txt").write_text("work")
        self.assertIn("kept", self.reap())
        self.assertEqual(self.reap(), "")
        (wt / "new.txt").unlink()
        self.assertIn("removed", self.reap())
        self.assertEqual((self.fleet / "reap-kept").read_text(), "")

    def test_archive_is_never_overwritten(self):
        wt, name = self.finished()
        archive = self.fleet / "workers-archive"
        archive.mkdir()
        (archive / f"{name}.env").write_text("old-one\n")
        self.assertIn("the archive already", self.reap())
        self.assertEqual((archive / f"{name}.env").read_text(), "old-one\n")

    def test_guard_runs_the_reap_every_tenth_look(self):
        wt, name = self.finished()
        self.guard(looks=9)
        self.assertTrue(wt.exists())
        self.guard(looks=10)
        self.assert_removed(wt, name)


class AuditWaiting(Events):
    def stamp(self, name, status, minutes_ago, window=True, screen="idle\n"):
        self.worker(name, status)
        when = time.strftime("%Y-%m-%d %H:%M", time.localtime(time.time() - minutes_ago * 60))
        with (self.fleet / f"workers/{name}.env").open("a") as f:
            f.write(f"reported={when}\n")
        if window:
            self.windows.write_text(f"{name}\n")
            (self.pane / name).write_text(screen)

    def test_waiting_over_ten_minutes_is_reported(self):
        for status in ("ready-to-merge", "asking", "blocked"):
            with self.subTest(status):
                self.stamp("w", status, 11)
                self.assertIn("WAITING LONGER THAN 10 MIN: w", self.audit())

    def test_fresh_wait_and_plain_work_are_not_reported(self):
        self.stamp("w", "blocked", 5)
        self.assertNotIn("WAITING LONGER", self.audit())
        self.stamp("w", "working", 30)
        self.assertNotIn("WAITING LONGER", self.audit())

    def test_unsent_text_counts_from_the_first_audit_that_saw_it(self):
        self.stamp("w", "working", 1, screen="❯ an instruction\n")
        self.assertNotIn("UNSENT TEXT", self.audit())
        env = self.fleet / "workers/w.env"
        since = int(next(l for l in env.read_text().splitlines() if l.startswith("unsent_since=")).split("=")[1])
        env.write_text(env.read_text().replace(f"unsent_since={since}", f"unsent_since={since - 660}"))
        self.assertIn("UNSENT TEXT LONGER THAN 10 MIN: w", self.audit())

    def test_sent_text_resets_the_clock(self):
        self.stamp("w", "working", 1, screen="❯ an instruction\n")
        self.audit()
        (self.pane / "w").write_text("idle\n")
        self.audit()
        self.assertIn("unsent_since=\n", (self.fleet / "workers/w.env").read_text())


if __name__ == "__main__":
    unittest.main()
