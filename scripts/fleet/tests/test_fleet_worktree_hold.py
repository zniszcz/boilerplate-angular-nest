"""When a merged branch's worktree may go although it has commits after the squash-merge.

fleet-reap.sh and fleet-cleanup.sh share fleet_worktree_hold: the worktree goes
when every file the branch changed is already on origin/main in the same or
a newer form, and stays when a commit carries content the base branch never had.

Run: python3 -m unittest discover -s scripts/fleet/tests
"""
import subprocess
import unittest

from test_fleet_cleanup import Fleet, git


class MergedBranch(Fleet):
    """A scratch repository with a bare origin and one branch squash-merged into main."""

    def setUp(self):
        super().setUp()
        self.origin = self.base / "origin.git"
        subprocess.run(["git", "init", "-q", "--bare", str(self.origin)], check=True)
        git(self.repo, "remote", "add", "origin", str(self.origin))
        self.write(self.repo, "GUIDE.md", "v0\n")
        self.commit(self.repo, "guide v0")
        git(self.repo, "push", "-q", "origin", "main")

        self.path = self.worktree("task", merged=False)
        self.write(self.path, "GUIDE.md", "v1\n")
        self.write(self.path, "Code.java", "class Code {}\n")
        self.commit(self.path, "task")
        head = git(self.path, "rev-parse", "HEAD")
        (self.merged / "feat-task").write_text(head + "\n")
        (self.merged / "pr-42").write_text(head + "\n")
        self.on_main("squash: task", {"GUIDE.md": "v1\n", "Code.java": "class Code {}\n"})

    def write(self, root, name, text):
        (root / name).write_text(text)

    def commit(self, root, message):
        git(root, "add", "-A")
        git(root, "commit", "-q", "-m", message)

    def on_main(self, message, files):
        """A commit on main, pushed to origin and fetched, as another PR's merge would be."""
        for name, text in files.items():
            self.write(self.repo, name, text)
        self.commit(self.repo, message)
        git(self.repo, "push", "-q", "origin", "main")
        git(self.repo, "fetch", "-q", "origin")

    def assert_removed(self, output):
        self.assertFalse(self.path.exists(), output)
        self.assertIn(f"removed: {self.path}", output)

    def assert_kept(self, output, file):
        self.assertTrue(self.path.exists(), output)
        self.assertIn(f"commits after the merge bring: {file}", output)


class Cleanup(MergedBranch):
    def test_older_guide_already_on_main_goes(self):
        self.on_main("next PR", {"GUIDE.md": "v2\n"})
        # After the merge the worker refreshed its own guide to the merged version once more.
        self.write(self.path, "GUIDE.md", "v1\n")
        git(self.path, "commit", "-q", "--allow-empty", "-m", "touch guide")
        self.assert_removed(self.cleanup())

    def test_merge_of_main_into_the_branch_goes(self):
        self.on_main("next PR", {"GUIDE.md": "v2\n", "Inny.java": "class Inny {}\n"})
        git(self.path, "fetch", "-q", "origin")
        git(self.path, "merge", "-q", "--no-edit", "-X", "theirs", "origin/main")
        self.assert_removed(self.cleanup())

    def test_empty_commit_after_the_merge_goes(self):
        git(self.path, "commit", "-q", "--allow-empty", "-m", "nothing")
        self.assert_removed(self.cleanup())

    def test_commit_with_new_content_stays(self):
        self.write(self.path, "Code.java", "class Code { int fix; }\n")
        self.commit(self.path, "fix after merge")
        output = self.cleanup()
        self.assert_kept(output, "Code.java")
        self.assertIn("fix", (self.path / "Code.java").read_text())

    def test_new_file_after_the_merge_stays(self):
        self.write(self.path, "Nowy.java", "class Nowy {}\n")
        self.commit(self.path, "new file")
        self.assert_kept(self.cleanup(), "Nowy.java")

    def test_deletion_main_does_not_have_stays(self):
        (self.path / "Code.java").unlink()
        self.commit(self.path, "drop Code")
        self.assert_kept(self.cleanup(), "Code.java")

    def test_branch_behind_a_newer_file_on_main_but_with_own_change_stays(self):
        self.on_main("next PR", {"GUIDE.md": "v2\n"})
        self.write(self.path, "GUIDE.md", "v1 i moja uwaga\n")
        self.commit(self.path, "own guide note")
        self.assert_kept(self.cleanup(), "GUIDE.md")


class Reap(MergedBranch):
    def setUp(self):
        super().setUp()
        (self.fleet / "workers/feat-task.env").write_text(
            "status=merged\nbranch=feat/task\npr=https://github.com/x/y/pull/42\n"
        )

    def reap(self):
        return self.run_script("fleet-reap.sh")

    def test_branch_with_only_merged_content_is_reaped(self):
        self.on_main("next PR", {"GUIDE.md": "v2\n"})
        git(self.path, "commit", "-q", "--allow-empty", "-m", "nothing")
        output = self.reap()
        self.assertFalse(self.path.exists(), output)
        self.assertIn("removed: feat-task", output)
        self.assertTrue((self.fleet / "workers-archive/feat-task.env").exists())

    def test_branch_with_lost_work_is_kept_and_reported(self):
        self.write(self.path, "Code.java", "class Code { int fix; }\n")
        self.commit(self.path, "fix after merge")
        output = self.reap()
        self.assertTrue(self.path.exists(), output)
        self.assertIn("commits after the merge bring: Code.java", output)
        self.assertIn("commits after the merge bring: Code.java", (self.fleet / "reap-kept").read_text())
        self.assertTrue((self.fleet / "workers/feat-task.env").exists())


if __name__ == "__main__":
    unittest.main()
