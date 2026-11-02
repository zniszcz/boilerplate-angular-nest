"""fleet-cleanup.sh and the audit's reminder, run on copies of the scripts in a scratch repository.

Run: python3 -m unittest discover -s scripts/fleet/tests
"""
import os
import shutil
import subprocess
import tempfile
import time
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]

GH_STUB = """#!/usr/bin/env bash
# Prints the merged head recorded for the branch in $GH_MERGED/<branch with / as ->,
# and for `pr view <n>` the one in $GH_MERGED/pr-<n>.
case "$*" in
  "pr view"*)
    head="$(cat "$GH_MERGED/pr-$3" 2>/dev/null)" || exit 1
    echo "MERGED $head"
    ;;
  *"--state merged"*)
    while [ $# -gt 0 ]; do [ "$1" = --head ] && branch="$2"; shift; done
    cat "$GH_MERGED/${branch//\\//-}" 2>/dev/null
    ;;
  *"--base"*) echo '[]' ;;
esac
exit 0
"""

TMUX_STUB = """#!/usr/bin/env bash
cat "$TMUX_WINDOWS" 2>/dev/null
exit 0
"""


def git(cwd, *args):
    return subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@t", *args],
        cwd=cwd, check=True, capture_output=True, text=True,
    ).stdout.strip()


class Fleet(unittest.TestCase):
    def setUp(self):
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        self.base = Path(scratch.name).resolve()
        self.repo = self.base / "repo"
        self.root = self.repo
        self.scripts = self.root / "scripts/fleet"
        self.fleet = self.root / ".fleet"
        self.tmp = self.base / "tmp"
        self.merged = self.base / "merged"
        self.windows = self.base / "windows"
        bin_dir = self.base / "bin"

        shutil.copytree(SCRIPTS, self.scripts, ignore=shutil.ignore_patterns("tests", "__pycache__", "guard.conf"))
        for folder in (self.tmp, self.merged, bin_dir, self.fleet / "workers"):
            folder.mkdir(parents=True, exist_ok=True)
        for name, body in (("gh", GH_STUB), ("tmux", TMUX_STUB)):
            (bin_dir / name).write_text(body)
            (bin_dir / name).chmod(0o755)
        self.windows.write_text("")
        brief = self.repo / ".agents/skills/manage-fleet/WORKER-BRIEF.md"
        brief.parent.mkdir(parents=True)
        brief.write_text("brief\n")
        (self.repo / ".gitignore").write_text(".fleet/\nbuild/\ntools/fleet/guard.conf\n__pycache__/\n")

        git(self.repo, "init", "-q", "-b", "main")
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-q", "-m", "init")

        self.gates_marker = str(self.base / "tools/gates.sh")
        self.env = {
            **os.environ,
            "PATH": f"{bin_dir}:{os.environ['PATH']}",
            "TMPDIR": str(self.tmp),
            "GH_MERGED": str(self.merged),
            "TMUX_WINDOWS": str(self.windows),
            "FLEET_GATES_SCRIPT": self.gates_marker,
            # The repository's fleet.conf is copied with the scripts; the tests pin their own.
            "FLEET_NAME": "test", "FLEET_MAIN": "main", "FLEET_SCOPE": "", "FLEET_GATES": "local",
            "FLEET_GUIDE": "", "FLEET_SESSION": "test-fleet", "FLEET_MANAGER_SESSION": "test-manager",
        }

    def run_script(self, name):
        result = subprocess.run(
            [str(self.scripts / name)], env=self.env, capture_output=True, text=True, timeout=60,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def cleanup(self):
        return self.run_script("fleet-cleanup.sh")

    def audit(self):
        return self.run_script("fleet-audit.sh")

    def gate_dir(self):
        gate = self.tmp / "test-gates.abc"
        gate.mkdir()
        return gate

    def worktree(self, slug, merged=True):
        path = self.base / f"repo--{slug}"
        git(self.repo, "worktree", "add", "-q", str(path), "-b", f"feat/{slug}")
        (path / "build").mkdir(parents=True)
        (path / "build/out.bin").write_text("x")
        if merged:
            (self.merged / f"feat-{slug}").write_text(git(path, "rev-parse", "HEAD") + "\n")
        return path

    def worker(self, name, status):
        (self.fleet / f"workers/{name}.env").write_text(f"status={status}\n")
        (self.fleet / f"workers/{name}.prompt").write_text("prompt\n")

    def sleeper(self, *args, cwd=None):
        process = subprocess.Popen(args, cwd=cwd)
        self.addCleanup(process.wait)
        self.addCleanup(process.kill)
        time.sleep(0.2)


class GateDirectories(Fleet):
    def test_directory_without_a_running_gate_disappears(self):
        gate = self.gate_dir()
        output = self.cleanup()
        self.assertFalse(gate.exists())
        self.assertIn(f"removed: {gate}", output)

    def test_directory_stays_while_a_gate_process_runs(self):
        gate = self.gate_dir()
        script = Path(self.gates_marker)
        script.parent.mkdir()
        script.write_text("sleep 30\n")
        self.sleeper("bash", str(script), "13")
        output = self.cleanup()
        self.assertTrue(gate.exists())
        self.assertIn(f"kept: {gate}", output)

    def test_worker_quoting_the_gate_path_in_its_prompt_is_not_a_running_gate(self):
        gate = self.gate_dir()
        self.sleeper("bash", "-c", f"sleep 30; : {self.gates_marker}")
        self.cleanup()
        self.assertFalse(gate.exists())

    def test_directory_stays_while_a_process_holds_it(self):
        gate = self.gate_dir()
        self.sleeper("sleep", "30", cwd=gate)
        output = self.cleanup()
        self.assertTrue(gate.exists())
        self.assertIn("a process holds the folder", output)

    def test_registered_gate_worktree_is_unregistered(self):
        gate = self.tmp / "test-gates.reg"
        git(self.repo, "worktree", "add", "-q", "--detach", str(gate))
        self.cleanup()
        self.assertFalse(gate.exists())
        self.assertNotIn(str(gate), git(self.repo, "worktree", "list"))

    def test_other_directories_in_tmp_are_untouched(self):
        other = self.tmp / "cudzy-katalog"
        other.mkdir()
        self.cleanup()
        self.assertTrue(other.exists())


class Worktrees(Fleet):
    def test_merged_clean_worktree_goes_with_its_build(self):
        path = self.worktree("gotowe")
        output = self.cleanup()
        self.assertFalse(path.exists())
        self.assertIn(f"removed: {path}", output)

    def test_worktree_with_uncommitted_file_stays_and_is_reported(self):
        path = self.worktree("brudne")
        (path / "work.txt").write_text("uncommitted")
        output = self.cleanup()
        self.assertEqual((path / "work.txt").read_text(), "uncommitted")
        self.assertIn(f"kept: {path} (uncommitted work)", output)

    def test_commits_after_the_merge_without_origin_to_compare_stay(self):
        path = self.worktree("dalej")
        git(path, "commit", "-q", "--allow-empty", "-m", "more")
        output = self.cleanup()
        self.assertTrue(path.exists())
        self.assertIn("cannot compare with origin/main", output)

    def test_worktree_of_a_live_worker_stays(self):
        path = self.worktree("alive")
        self.windows.write_text("feat-alive\n")
        output = self.cleanup()
        self.assertTrue(path.exists())
        self.assertIn("the worker is still alive", output)

    def test_unmerged_worktree_stays_silently(self):
        path = self.worktree("otwarte", merged=False)
        output = self.cleanup()
        self.assertTrue(path.exists())
        self.assertNotIn(str(path), output)

    def test_main_checkout_stays(self):
        self.cleanup()
        self.assertTrue(self.repo.exists())


class Records(Fleet):
    def test_retired_record_moves_to_the_archive(self):
        self.worker("old-one", "retired")
        self.cleanup()
        self.assertFalse((self.fleet / "workers/old-one.env").exists())
        self.assertTrue((self.fleet / "workers-archive/old-one.env").exists())
        self.assertTrue((self.fleet / "workers-archive/old-one.prompt").exists())

    def test_working_record_stays(self):
        self.worker("czynny", "working")
        self.cleanup()
        self.assertTrue((self.fleet / "workers/czynny.env").exists())

    def test_archived_record_is_never_overwritten(self):
        self.worker("old-one", "retired")
        archive = self.fleet / "workers-archive"
        archive.mkdir()
        (archive / "old-one.env").write_text("status=retired\nold=1\n")
        output = self.cleanup()
        self.assertIn("old=1", (archive / "old-one.env").read_text())
        self.assertTrue((self.fleet / "workers/old-one.env").exists())
        self.assertIn("kept: record old-one", output)


class Report(Fleet):
    def test_reports_free_space(self):
        output = self.cleanup()
        self.assertIn("free space before:", output)
        self.assertIn("free space after:", output)

    def test_records_time_and_round(self):
        self.audit()
        self.audit()
        self.audit()
        self.cleanup()
        content = (self.fleet / "last-cleanup").read_text()
        self.assertRegex(content, r"time=\d{4}-\d\d-\d\d \d\d:\d\d:\d\d")
        self.assertIn("round=2", content)


class Reminder(Fleet):
    REMINDER = "CLEANUP OVERDUE"

    def rounds(self, count):
        """Each round is an opening and a closing audit; returns the last output."""
        output = ""
        for _ in range(count * 2):
            output = self.audit()
        return output

    def test_silent_for_two_rounds(self):
        self.assertNotIn(self.REMINDER, self.rounds(2))

    def test_reminds_when_the_third_round_opens(self):
        self.rounds(2)
        self.assertIn(self.REMINDER, self.audit())

    def test_cleanup_silences_the_reminder(self):
        self.rounds(3)
        self.cleanup()
        self.assertNotIn(self.REMINDER, self.audit())

    def test_reminds_again_three_rounds_after_a_cleanup(self):
        self.rounds(1)
        self.cleanup()
        self.assertNotIn(self.REMINDER, self.rounds(2))
        self.assertIn(self.REMINDER, self.audit())

    def test_timestamp_only_file_counts_as_round_zero(self):
        (self.fleet / "last-cleanup").write_text("2026-10-30 23:17:44\n")
        self.rounds(2)
        self.assertIn(self.REMINDER, self.audit())


class SpawnCeiling(Fleet):
    def spawn(self):
        (self.scripts.parent / "WORKER-BRIEF.md").write_text("brief\n")
        return subprocess.run(
            [str(self.scripts / "fleet-spawn.sh"), "feat/new", "task"],
            env=self.env, capture_output=True, text=True, timeout=60,
        )

    def workers(self, status, count=9):
        for number in range(count):
            self.worker(f"feat-{status}-{number}", status)

    def assert_spawned(self):
        result = self.spawn()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.fleet / "workers/feat-new.env").exists())

    def assert_refused(self):
        result = self.spawn()
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("9 unfinished workers", result.stderr)
        self.assertFalse((self.fleet / "workers/feat-new.env").exists())

    def test_nine_retired_records_do_not_block(self):
        self.workers("retired")
        self.assert_spawned()

    def test_nine_merged_or_done_records_do_not_block(self):
        self.workers("merged", 5)
        self.workers("done", 4)
        self.assert_spawned()

    def test_nine_live_workers_block(self):
        self.workers("working")
        self.assert_refused()

    def test_worker_parked_on_a_decision_counts(self):
        self.workers("working", 8)
        self.worker("feat-asks", "asking")
        self.assert_refused()

    def test_eight_live_workers_among_retired_do_not_block(self):
        (self.fleet / "pool").write_text("9\n")
        self.workers("working", 8)
        self.workers("retired", 3)
        self.assert_spawned()

    def test_full_pool_blocks(self):
        (self.fleet / "pool").write_text("2\n")
        self.workers("review", 2)
        result = self.spawn()
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("pool full", result.stderr)

    def test_free_place_in_pool_allows(self):
        (self.fleet / "pool").write_text("3\n")
        self.workers("review", 2)
        self.assert_spawned()

    def test_no_records_at_all_do_not_block(self):
        self.assert_spawned()


if __name__ == "__main__":
    unittest.main()
