"""fleet-handover.sh: tag numbers with any number of digits, sorted numerically.

Run: python3 -m unittest discover -s scripts/fleet/tests
"""
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
from fleet_handover_tags import nr_key, parse  # noqa: E402

TODO = """# Lista

- [ ] Hundredth item — its outcome. {handover 1.100 me}
- [ ] Ninety-ninth — outcome. {handover 1.99 me}
- [ ] Hundred and first — outcome. {handover 1.101 me doing}
- [ ] First — outcome. {handover 1.01 you}
- [x] Done earlier — outcome. {handover 0.1000 both}
- [ ] Second group — outcome. {handover 2.05 both}
"""


class Handover(unittest.TestCase):
    def setUp(self):
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        # fleet_root() is two levels above the scripts directory, tools/fleet.
        self.root = Path(scratch.name).resolve() / "repo"
        scripts = self.root / "scripts/fleet"
        shutil.copytree(SCRIPTS, scripts, ignore=shutil.ignore_patterns("tests", "__pycache__", "guard.conf"))
        self.script = scripts / "fleet-handover.sh"
        (self.root / "a.todo.md").write_text(TODO)

    def run_script(self, *args):
        return subprocess.run(["bash", str(self.script), *args], capture_output=True, text=True, check=True)

    def test_nr_key_is_numeric(self):
        self.assertLess(nr_key("1.99"), nr_key("1.100"))
        self.assertLess(nr_key("1.100"), nr_key("1.1000"))
        self.assertEqual(nr_key("1.05"), nr_key("1.5"))

    def test_parse_sees_three_digit_tags_in_numeric_order(self):
        items, warn = parse(str(self.root))
        self.assertEqual([i["nr"] for i in items], ["0.1000", "1.01", "1.99", "1.100", "1.101", "2.05"])
        self.assertEqual(warn, [])

    def test_leading_zero_is_a_duplicate(self):
        (self.root / "b.todo.md").write_text("- [ ] Another — outcome. {handover 1.5 me}\n- [ ] The same — outcome. {handover 1.05 me}\n")
        _, warn = parse(str(self.root))
        self.assertTrue(any("duplicate 1.05" in w for w in warn), warn)

    def test_summary_lists_open_items_in_numeric_order(self):
        lines = self.run_script("summary").stdout.splitlines()
        self.assertEqual([l.split()[0] for l in lines], ["1.01", "1.99", "1.100", "1.101", "2.05"])
        self.assertFalse(any(l.startswith("WARN") for l in lines))

    def test_render_puts_three_digit_items_in_group_one(self):
        self.run_script("render")
        page = (self.root / ".fleet/handover/index.html").read_text()
        group1 = page.split("<h2>1. My queue")[1].split("<h2>2.")[0]
        titles = ["Ninety-ninth", "Hundredth item", "Hundred and first"]
        self.assertEqual(sorted(titles, key=group1.index), titles)
        self.assertIn("Done earlier", page)

    def test_set_marks_a_three_digit_item_done(self):
        self.run_script("set", "1.100", "done")
        self.assertIn("- [x] Hundredth item — its outcome. {handover 1.100 me}", (self.root / "a.todo.md").read_text())


if __name__ == "__main__":
    unittest.main()
