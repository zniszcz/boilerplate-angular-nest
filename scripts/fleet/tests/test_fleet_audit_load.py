"""The audit's load position, run with fake measurements so the machine's real load does not matter.

Run: python3 -m unittest discover -s scripts/fleet/tests
"""
import unittest

from test_fleet_cleanup import Fleet

POSITION = "MACHINE OVERLOADED"
GB = 1024 * 1024


class Load(Fleet):
    def setUp(self):
        super().setUp()
        self.env.pop("FLEET_POOL", None)
        self.bin = self.base / "bin"
        self.stub("nproc", "echo 4")
        self.measure(load="1.00", available_kb=32 * GB, gpu="10")

    def stub(self, name, body):
        path = self.bin / name
        path.write_text(f"#!/usr/bin/env bash\n{body}\n")
        path.chmod(0o755)

    def measure(self, load=None, available_kb=None, gpu=None):
        if load is not None:
            path = self.base / "loadavg"
            path.write_text(f"{load} 0.50 0.25 1/100 1234\n")
            self.env["FLEET_LOADAVG"] = str(path)
        if available_kb is not None:
            path = self.base / "meminfo"
            path.write_text(f"MemTotal: {64 * GB} kB\nMemAvailable: {available_kb} kB\n")
            self.env["FLEET_MEMINFO"] = str(path)
        if gpu is not None:
            self.stub("fake-nvidia-smi", f"printf '{gpu}\\n'")
            self.env["FLEET_NVIDIA_SMI"] = str(self.bin / "fake-nvidia-smi")

    def position(self, output):
        lines = [line for line in output.splitlines() if POSITION in line]
        self.assertLessEqual(len(lines), 1, output)
        return lines[0] if lines else None


class Thresholds(Load):
    def test_quiet_machine_has_no_position(self):
        self.assertIsNone(self.position(self.audit()))

    def test_load_above_the_core_count_triggers_it(self):
        self.measure(load="4.01")
        self.assertIn("load 4.01", self.position(self.audit()))

    def test_load_equal_to_the_core_count_does_not(self):
        self.measure(load="4.00")
        self.assertIsNone(self.position(self.audit()))

    def test_gpu_above_the_threshold_triggers_it(self):
        self.measure(gpu="91")
        self.assertIn("GPU 91%", self.position(self.audit()))

    def test_gpu_at_the_threshold_does_not(self):
        self.measure(gpu="90")
        self.assertIsNone(self.position(self.audit()))

    def test_the_busiest_of_several_gpus_counts(self):
        self.measure(gpu="95\\n5")
        self.assertIn("GPU 95%", self.position(self.audit()))

    def test_memory_below_the_threshold_triggers_it(self):
        self.measure(available_kb=8 * GB - 1)
        self.assertIn("available memory", self.position(self.audit()))

    def test_memory_at_the_threshold_does_not(self):
        self.measure(available_kb=8 * GB)
        self.assertIsNone(self.position(self.audit()))

    def test_several_exceeded_thresholds_make_one_position(self):
        self.measure(load="9.00", gpu="99", available_kb=GB)
        line = self.position(self.audit())
        for reason in ("load 9.00", "GPU 99%", "available memory"):
            self.assertIn(reason, line)


class UnknownGpu(Load):
    def test_missing_nvidia_smi_is_unknown_and_no_position(self):
        self.env["FLEET_NVIDIA_SMI"] = str(self.base / "no-such-command")
        output = self.audit()
        self.assertIsNone(self.position(output))
        self.assertIn("GPU unknown", output)

    def test_failing_nvidia_smi_is_unknown_and_no_position(self):
        self.stub("fake-nvidia-smi", "echo 'NVIDIA-SMI has failed'; exit 9")
        output = self.audit()
        self.assertIsNone(self.position(output))
        self.assertIn("GPU unknown", output)

    def test_other_thresholds_still_work_without_a_gpu(self):
        self.env["FLEET_NVIDIA_SMI"] = str(self.base / "no-such-command")
        self.measure(load="5.00")
        self.assertIn("load 5.00", self.position(self.audit()))


class Recommendation(Load):
    def overloaded_with_pool(self, pool):
        (self.fleet / "pool").write_text(f"{pool}\n")
        self.measure(load="9.00")
        return self.position(self.audit())

    def test_pool_drops_by_one(self):
        self.assertIn("lower .fleet/pool from 6 to 5", self.overloaded_with_pool(6))

    def test_pool_can_drop_to_two(self):
        self.assertIn("lower .fleet/pool from 3 to 2", self.overloaded_with_pool(3))

    def test_pool_never_drops_below_two(self):
        line = self.overloaded_with_pool(2)
        self.assertNotIn("lower .fleet/pool from", line)
        self.assertIn("goes no lower", line)


class MeasurementLine(Load):
    def test_every_audit_shows_what_it_measured(self):
        output = self.audit()
        self.assertIn("Load: load 1.00, cores 4, GPU 10%, available memory 32.0 GB", output)


if __name__ == "__main__":
    unittest.main()
