"""fleet-shutdown.sh against dummy tmux sessions on a private tmux server.

Safety: every test runs tmux with its own TMUX_TMPDIR and without TMUX, so the
script and the test talk to a separate tmux server and can never reach the real
fleet sessions. Session names are unique per run on top of that.

Each pane runs a stand-in for Claude Code (a bash script named claude) that
registers a conversation in <CLAUDE_CONFIG_DIR>/sessions/<pid>.json like the real
one, keeps a sleep child, and leaves one more sleep outside its process tree
(double fork) that only the pane's environment still ties to the fleet.

Run: python3 -m unittest discover -s scripts/fleet/tests
"""
import os
import shutil
import subprocess
import tempfile
import time
import unittest
import uuid
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]

FAKE_CLAUDE = """#!/bin/bash
# Stand-in for Claude Code. $1: conversation id, or "none" for a process without one.
if [ "$1" != none ]; then
  mkdir -p "$CLAUDE_CONFIG_DIR/sessions"
  printf '{"pid":%s,"sessionId":"%s","cwd":"%s","kind":"interactive"}' $$ "$1" "$PWD" \\
    > "$CLAUDE_CONFIG_DIR/sessions/$$.json"
fi
sleep 300 &
echo $! >> "$FAKE_PIDS"
# A daemon that left the tree, as a build daemon does; only TMUX_PANE ties it here.
( sleep 301 & echo $! >> "$FAKE_PIDS" )
echo $$ >> "$FAKE_PIDS"
wait
"""


def git(cwd, *args):
    return subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@t", *args],
        cwd=cwd, check=True, capture_output=True, text=True,
    ).stdout.strip()


def alive(pid):
    try:
        state = Path(f"/proc/{pid}/stat").read_text().rsplit(") ", 1)[1].split()[0]
    except (FileNotFoundError, ProcessLookupError, IndexError):
        return False
    return state != "Z"


class Shutdown(unittest.TestCase):
    def setUp(self):
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        self.base = Path(scratch.name).resolve()
        self.repo = self.base / "repo"
        self.scripts = self.repo / SCRIPTS.relative_to(SCRIPTS.parents[1])
        self.fleet = self.repo / ".fleet"
        self.claude_dir = self.base / "claude"
        self.pids_file = self.base / "fake-pids"
        bin_dir = self.base / "bin"
        # A short path: tmux sockets have a length limit.
        self.tmux_dir = Path(tempfile.mkdtemp(prefix="fs-tmux-"))
        self.addCleanup(shutil.rmtree, self.tmux_dir, True)

        shutil.copytree(SCRIPTS, self.scripts, ignore=shutil.ignore_patterns("tests", "__pycache__", "guard.conf"))
        for folder in (bin_dir, self.fleet / "workers", self.claude_dir / "projects/-repo"):
            folder.mkdir(parents=True, exist_ok=True)
        (bin_dir / "claude").write_text(FAKE_CLAUDE)
        (bin_dir / "claude").chmod(0o755)
        (self.repo / ".gitignore").write_text(".fleet/\n")
        git(self.repo, "init", "-q", "-b", "main")
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-q", "-m", "init")

        tag = uuid.uuid4().hex[:8]
        self.manager = f"fstest-{tag}-manager"
        self.workers = f"fstest-{tag}-fleet"
        self.env = {
            **{k: v for k, v in os.environ.items() if not k.startswith(("FLEET_", "GATES_", "TMUX"))},
            "PATH": f"{bin_dir}:{os.environ['PATH']}",
            "TMUX_TMPDIR": str(self.tmux_dir),
            "CLAUDE_CONFIG_DIR": str(self.claude_dir),
            "FAKE_PIDS": str(self.pids_file),
            "FLEET_NAME": "fstest", "FLEET_MAIN": "main", "FLEET_SCOPE": "", "FLEET_GUIDE": "",
            "FLEET_SESSION": self.workers, "FLEET_MANAGER_SESSION": self.manager,
            "FLEET_SHUTDOWN_DELAY": "0", "FLEET_SHUTDOWN_GRACE": "2",
        }
        # The guarantee that the real tmux server is out of reach.
        self.assertNotIn("TMUX", self.env)
        self.assertTrue(self.env["TMUX_TMPDIR"].startswith(str(self.tmux_dir)))
        self.addCleanup(self.kill_leftovers)

    def tmux(self, *args, check=True):
        return subprocess.run(["tmux", *args], env=self.env, capture_output=True, text=True, check=check)

    def kill_leftovers(self):
        self.tmux("kill-server", check=False)
        for pid in self.fake_pids():
            if alive(pid):
                os.kill(pid, 9)

    def fake_pids(self):
        if not self.pids_file.exists():
            return []
        return [int(line) for line in self.pids_file.read_text().split()]

    def conversation(self, transcript=True):
        cid = str(uuid.uuid4())
        if transcript:
            (self.claude_dir / "projects/-repo" / f"{cid}.jsonl").write_text("{}\n")
        return cid

    def start(self, session, window, command, cwd=None):
        exists = self.tmux("has-session", "-t", f"={session}", check=False).returncode == 0
        where = ["new-window", "-d", "-t", f"={session}:"] if exists else ["new-session", "-d", "-s", session]
        self.tmux(*where, "-n", window, "-c", str(cwd or self.repo), command)

    def wait_for_fakes(self, count):
        deadline = time.time() + 10
        while time.time() < deadline and len(self.fake_pids()) < count:
            time.sleep(0.1)
        self.assertEqual(len(self.fake_pids()), count, "fake claude processes did not start")

    def fleet_up(self, worker_id=None, manager_id=None):
        """A manager with a guard window and one worker in its own worktree."""
        self.manager_id = manager_id or self.conversation()
        self.worker_id = worker_id or self.conversation()
        (self.fleet / "manager-session").write_text("old-id\n")
        self.worktree = self.base / "repo--task"
        git(self.repo, "worktree", "add", "-q", str(self.worktree), "-b", "feat/task")
        (self.worktree / "draft.txt").write_text("work in progress\n")
        (self.fleet / "workers/feat-task.env").write_text("branch=feat/task\nstatus=working\n")
        self.start(self.manager, "claude", f"claude {self.manager_id}")
        self.start(self.manager, "guard", "sleep 300")
        self.start(self.workers, "feat-task", f"claude {self.worker_id}")
        self.wait_for_fakes(6)

    def shutdown(self, *args, code=0):
        result = subprocess.run(
            [str(self.scripts / "fleet-shutdown.sh"), *args],
            env=self.env, capture_output=True, text=True, timeout=60,
        )
        self.assertEqual(result.returncode, code, result.stdout + result.stderr)
        return result.stdout + result.stderr

    def tree(self):
        """Every process of the dummy sessions: pane pids, their trees, the fakes' daemons."""
        panes = self.tmux("list-panes", "-a", "-F", "#{pane_pid}").stdout.split()
        snapshot = subprocess.run(["ps", "-e", "-o", "pid=,ppid="], capture_output=True, text=True).stdout
        children = {}
        for line in snapshot.splitlines():
            pid, ppid = map(int, line.split())
            children.setdefault(ppid, []).append(pid)
        found, queue = set(), [int(p) for p in panes]
        while queue:
            pid = queue.pop()
            found.add(pid)
            queue.extend(children.get(pid, []))
        return found | set(self.fake_pids())

    def report(self):
        path = self.fleet / "shutdown-report.txt"
        deadline = time.time() + 30
        while time.time() < deadline:
            if path.exists() and "result:" in path.read_text():
                return path.read_text()
            time.sleep(0.2)
        self.fail("no final report")

    def session_exists(self, name):
        return self.tmux("has-session", "-t", f"={name}", check=False).returncode == 0


class Kill(Shutdown):
    def test_resume_file_first_then_nothing_survives(self):
        self.fleet_up()
        processes = self.tree()
        # Two fake claudes, their sleep children and daemons, and the guard window.
        self.assertEqual(len(processes), 7)
        output = self.shutdown()

        resume = (self.fleet / "resume.md").read_text()
        self.assertIn(self.manager_id, resume)
        self.assertIn(self.worker_id, resume)
        self.assertIn("resume-manager.sh", resume)
        self.assertIn(f"--resume {self.worker_id}", resume)
        self.assertIn("feat/task", resume)
        self.assertIn(str(self.worktree), resume)
        self.assertIn("draft.txt", resume)
        self.assertIn("old-id", resume)
        self.assertEqual((self.fleet / "manager-session").read_text().strip(), self.manager_id)
        self.assertIn("detached process", output)

        report = self.report()
        self.assertIn("result: ok", report.splitlines()[-1], report)
        self.assertFalse(self.session_exists(self.manager))
        self.assertFalse(self.session_exists(self.workers))
        survivors = [pid for pid in processes if alive(pid)]
        self.assertEqual(survivors, [], report)

    def test_only_exact_session_names_are_touched(self):
        """A session whose name merely starts with the fleet's is someone else's."""
        bystander = f"{self.manager}-other"
        self.start(bystander, "main", "sleep 300")
        output = self.shutdown()
        self.assertIn("nothing to shut down", output)
        self.assertTrue(self.session_exists(bystander))

    def test_process_ignoring_sigterm_gets_sigkill(self):
        self.fleet_up()
        self.start(self.workers, "stubborn", "trap '' TERM HUP; while :; do sleep 0.2; done")
        time.sleep(0.5)
        processes = self.tree()
        self.shutdown()
        report = self.report()
        self.assertIn("result: ok", report)
        self.assertNotIn("SIGKILL needed: 0", report)
        self.assertEqual([pid for pid in processes if alive(pid)], [], report)


class Abort(Shutdown):
    def assert_untouched(self, processes):
        self.assertTrue(self.session_exists(self.manager))
        self.assertTrue(self.session_exists(self.workers))
        self.assertFalse((self.fleet / "resume.md").exists())
        self.assertEqual((self.fleet / "manager-session").read_text().strip(), "old-id")
        time.sleep(1)
        self.assertEqual([pid for pid in processes if not alive(pid)], [])

    def test_claude_without_session_file_aborts(self):
        self.fleet_up()
        self.start(self.workers, "no-id", "claude none")
        self.wait_for_fakes(9)
        processes = self.tree()
        output = self.shutdown(code=1)
        self.assertIn("ABORTED", output)
        self.assertIn("no-id", output)
        self.assert_untouched(processes)

    def test_missing_transcript_aborts(self):
        self.fleet_up(worker_id=self.conversation(transcript=False))
        processes = self.tree()
        output = self.shutdown(code=1)
        self.assertIn("ABORTED", output)
        self.assertIn(f"{self.worker_id}.jsonl", output)
        self.assert_untouched(processes)

    def test_dry_run_changes_nothing(self):
        self.fleet_up()
        processes = self.tree()
        output = self.shutdown("--dry-run")
        self.assertIn("DRY RUN", output)
        self.assertIn(self.manager_id, output)
        self.assertIn(f"--resume {self.worker_id}", output)
        self.assertIn("Would kill", output)
        self.assert_untouched(processes)
        self.assertFalse((self.fleet / "shutdown").exists())


if __name__ == "__main__":
    unittest.main()
