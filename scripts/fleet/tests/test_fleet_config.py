"""What the generalized fleet adds: gates from GitHub Actions or local, the change scope,
the guide check and tools/fleet/gates.sh with its gates.list.

Run: python3 -m unittest discover -s scripts/fleet/tests
"""
import json
import subprocess
import unittest

from test_fleet_cleanup import Fleet, git

# `gh pr list --base ...` prints $GH_PRS; `gh pr view <n> --json comments` prints
# $GH_COMMENTS as the marker query's answer; anything else prints nothing.
GH_STUB = r"""#!/usr/bin/env bash
case "$*" in
  "pr list --base"*) cat "$GH_PRS" ;;
  "pr view"*"comments"*) cat "$GH_COMMENTS" 2>/dev/null ;;
esac
exit 0
"""


class PullRequests(Fleet):
    def setUp(self):
        super().setUp()
        stub = self.base / "bin/gh"
        stub.write_text(GH_STUB)
        self.prs = self.base / "prs.json"
        self.comments = self.base / "comments"
        self.env.update(GH_PRS=str(self.prs), GH_COMMENTS=str(self.comments))

    def pr(self, checks=None, files=("a.js",), state="CLEAN"):
        self.prs.write_text(json.dumps([{
            "number": 7, "headRefName": "feat/x", "headRefOid": "abc123", "mergeStateStatus": state,
            "files": [{"path": f} for f in files], "statusCheckRollup": checks or [],
        }]))

    def test_github_red_check_is_reported(self):
        self.env["FLEET_GATES"] = "github"
        self.pr([{"status": "COMPLETED", "conclusion": "SUCCESS"}, {"status": "COMPLETED", "conclusion": "FAILURE"}])
        self.assertIn("CI RED: PR #7", self.audit())

    def test_github_pr_without_checks_is_reported(self):
        self.env["FLEET_GATES"] = "github"
        self.pr([])
        self.assertIn("PR WITHOUT CI CHECKS: #7", self.audit())

    def test_github_pending_checks_wait_quietly(self):
        self.env["FLEET_GATES"] = "github"
        self.pr([{"status": "IN_PROGRESS", "conclusion": ""}])
        out = self.audit()
        self.assertNotIn("#7", out)

    def test_github_check_running_too_long_is_hung(self):
        self.env["FLEET_GATES"] = "github"
        self.pr([{"status": "IN_PROGRESS", "conclusion": "", "name": "End-to-end", "startedAt": "2020-01-01T00:00:00Z"}])
        self.assertIn("PR #7 / End-to-end", self.audit())

    def test_github_green_pr_waits_for_the_manager(self):
        self.env["FLEET_GATES"] = "github"
        self.pr([{"status": "COMPLETED", "conclusion": "SUCCESS"}, {"state": "SUCCESS"}])
        self.assertIn("PR GREEN AND NOT MERGED: #7", self.audit())

    def test_local_pr_without_a_marker_on_its_head_needs_gates(self):
        self.pr()
        self.comments.write_text("oldsha ok\n")
        self.assertIn("PR WITHOUT GATES ON ITS CURRENT HEAD: #7", self.audit())

    def test_local_marker_on_the_head_makes_it_green(self):
        self.pr()
        self.comments.write_text("abc123 ok\n")
        self.assertIn("PR GREEN AND NOT MERGED: #7", self.audit())

    def test_scope_reports_files_outside_it(self):
        self.env["FLEET_SCOPE"] = "app/"
        self.pr(files=("app/a.js", "lib/b.js"))
        self.assertIn("PR TOUCHES FILES OUTSIDE app/: #7 (feat/x), files: 1", self.audit())

    def test_empty_scope_allows_every_path(self):
        self.pr(files=("app/b.js",))
        self.assertNotIn("OUTSIDE", self.audit())


class Guide(Fleet):
    def check(self):
        return subprocess.run(
            [str(self.scripts / "fleet-guide-check.sh"), "main"], cwd=self.repo, env=self.env,
            capture_output=True, text=True, timeout=60,
        )

    def commit(self, files):
        for name, text in files.items():
            path = self.repo / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "change")

    def setUp(self):
        super().setUp()
        self.env["FLEET_GUIDE"] = "GUIDE.md"
        self.commit({"GUIDE.md": "v1\n", "package.json": json.dumps({"scripts": {"test": "x"}})})

    def test_fresh_guide_has_no_findings(self):
        self.assertEqual(self.check().returncode, 0)

    def test_new_document_adr_and_command_after_the_guide_are_findings(self):
        self.commit({"docs/new.md": "x\n", "docs/adr/0001-a.md": "x\n", "scripts/new.sh": "x\n"})
        result = self.check()
        self.assertEqual(result.returncode, 1)
        self.assertIn("document docs/new.md", result.stdout)
        self.assertIn("ADR docs/adr/0001-a.md", result.stdout)
        self.assertIn("command scripts/new.sh", result.stdout)

    def test_fleet_tooling_and_tests_are_not_findings(self):
        self.commit({"scripts/fleet/new.sh": "x\n", "test/a.test.js": "x\n", ".agents/skills/a/SKILL.md": "x\n"})
        self.assertEqual(self.check().returncode, 0)

    def test_new_npm_command_is_a_finding_but_a_dependency_is_not(self):
        self.commit({"package.json": json.dumps({"scripts": {"test": "y"}, "dependencies": {"a": "1"}})})
        self.assertEqual(self.check().returncode, 0)
        self.commit({"package.json": json.dumps({"scripts": {"test": "y", "lint": "z"}})})
        result = self.check()
        self.assertIn("commands in package.json: lint", result.stdout)

    def test_touching_the_guide_closes_the_findings(self):
        self.commit({"docs/new.md": "x\n"})
        self.commit({"GUIDE.md": "v2\n"})
        self.assertEqual(self.check().returncode, 0)


class Gates(Fleet):
    def setUp(self):
        super().setUp()
        origin = self.base / "origin.git"
        subprocess.run(["git", "init", "-q", "--bare", str(origin)], check=True)
        git(self.repo, "remote", "add", "origin", str(origin))
        git(self.repo, "push", "-q", "origin", "main")
        git(self.repo, "switch", "-q", "-c", "feat/x")
        (self.repo / "a.txt").write_text("x\n")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "x")
        git(self.repo, "push", "-q", "origin", "feat/x")
        git(self.repo, "switch", "-q", "main")
        self.list = self.base / "gates.list"
        self.env["FLEET_GATES_LIST"] = str(self.list)

    def gates(self):
        return subprocess.run(
            [str(self.scripts / "gates.sh"), "feat/x"], env=self.env, capture_output=True, text=True, timeout=60,
        )

    def test_passing_gates_end_with_an_ok_marker_on_the_head(self):
        self.list.write_text("# a comment\nfile|file from the PR|cat a.txt && echo here\n")
        result = self.gates()
        head = git(self.repo, "rev-parse", "feat/x")
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertIn("| file from the PR | ✅ | here |", result.stdout)
        self.assertEqual(result.stdout.splitlines()[-1], f"<!-- gates {head} ok -->")

    def test_a_failing_gate_fails_the_run(self):
        self.list.write_text("good|good|true\nbad|bad|echo broken; exit 3\n")
        result = self.gates()
        self.assertEqual(result.returncode, 1)
        self.assertIn("| bad | ❌ | exit 3; last lines: broken", result.stdout)
        self.assertTrue(result.stdout.splitlines()[-1].endswith(" fail -->"))

    def test_scope_gate_fails_outside_the_scope(self):
        self.env["FLEET_SCOPE"] = "app/"
        self.list.write_text("")
        result = self.gates()
        self.assertEqual(result.returncode, 1)
        self.assertIn("files outside `app/`: 1", result.stdout)

    def test_a_partial_run_prints_no_marker(self):
        self.list.write_text("a|a|true\nb|b|true\n")
        self.env["GATES_ONLY"] = "a"
        result = self.gates()
        self.assertNotIn("<!-- gates", result.stdout)
        self.assertIn("| b | ⏭️ |", result.stdout)

    def test_the_temporary_worktree_is_removed(self):
        self.list.write_text("a|a|true\n")
        self.gates()
        self.assertEqual(list(self.tmp.glob("test-gates.*")), [])


class Config(Fleet):
    def test_fleet_conf_sets_the_name_and_the_environment_wins(self):
        (self.scripts / "fleet.conf").write_text("FLEET_NAME=zconf\nFLEET_MAIN=trunk\n")
        probe = '. "$1/fleet-lib.sh"; echo "$FLEET_NAME $FLEET_MAIN $FLEET_SESSION"'
        env = {k: v for k, v in self.env.items() if k not in ("FLEET_NAME", "FLEET_SESSION")}
        out = subprocess.run(["bash", "-c", probe, "_", str(self.scripts)], env=env,
                             capture_output=True, text=True, check=True).stdout.split()
        self.assertEqual(out, ["zconf", "main", "zconf-fleet"])


if __name__ == "__main__":
    unittest.main()
