from __future__ import annotations

import hashlib
import tempfile
import unittest
from pathlib import Path

from tools.release_control.checks_checksums import check_checksums
from tests.release_control.support import base_config


class ChecksumChecks(unittest.TestCase):
    def test_valid_ledger_passes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "file.txt"
            target.write_text("verified\n", encoding="utf-8")
            digest = hashlib.sha256(target.read_bytes()).hexdigest()
            (root / "SUMS.txt").write_text(
                f"{digest}  file.txt\n", encoding="utf-8"
            )
            result = check_checksums(root, base_config())
            self.assertEqual(result.status, "PASS")
            self.assertEqual(result.details["checked"], 1)

    def test_missing_ledger_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            result = check_checksums(Path(directory), base_config())
            self.assertEqual(result.status, "FAIL")

    def test_mismatch_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "file.txt").write_text("actual\n", encoding="utf-8")
            (root / "SUMS.txt").write_text(
                f"{'0' * 64}  file.txt\n", encoding="utf-8"
            )
            result = check_checksums(root, base_config())
            self.assertEqual(result.status, "FAIL")

    def test_invalid_line_format_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "SUMS.txt").write_text("invalid-line\n", encoding="utf-8")
            result = check_checksums(root, base_config())
            self.assertEqual(result.status, "FAIL")

    def test_duplicate_path_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "file.txt"
            target.write_text("verified\n", encoding="utf-8")
            digest = hashlib.sha256(target.read_bytes()).hexdigest()
            line = f"{digest}  file.txt\n"
            (root / "SUMS.txt").write_text(line + line, encoding="utf-8")
            result = check_checksums(root, base_config())
            self.assertEqual(result.status, "FAIL")


if __name__ == "__main__":
    unittest.main()
