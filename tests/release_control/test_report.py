from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.release_control.models import CheckResult, GovernanceReport, ManifestView
from tools.release_control.report import build_attestation
from tests.release_control.support import base_manifest, write_json


class ReportChecks(unittest.TestCase):
    def test_failed_check_marks_report_failed(self):
        report = GovernanceReport(release=232, mode="package", root=".")
        report.add(CheckResult("example", "FAIL", "failed"))
        self.assertEqual(report.status, "FAIL")
        self.assertEqual(len(report.errors), 1)

    def test_inconclusive_check_is_warning_not_failure(self):
        report = GovernanceReport(release=232, mode="package", root=".")
        report.add(CheckResult("remote", "INCONCLUSIVE", "unavailable"))
        self.assertEqual(report.status, "PASS")
        self.assertEqual(len(report.warnings), 1)

    def test_package_attestation_uses_manifest_base(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = base_manifest()
            path = root / "manifest.json"
            write_json(path, payload)
            report = GovernanceReport(release=232, mode="package", root=str(root))
            attestation = build_attestation(
                root, ManifestView(path, payload), report, False
            )
            self.assertEqual(attestation["commit"]["parent"], payload["base_commit"])
            self.assertEqual(attestation["commit"]["subject"], "NOT_RUN")
            self.assertEqual(len(attestation["manifest"]["sha256"]), 64)


if __name__ == "__main__":
    unittest.main()
