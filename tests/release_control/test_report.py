from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.release_control.models import CheckResult, GovernanceReport, ManifestView
from tools.release_control.report import build_attestation
from tests.release_control.support import base_manifest, write_json


class ReportChecks(unittest.TestCase):
    def test_failed_check_marks_report_failed(self):
        report = GovernanceReport(release=233, mode="package", root=".")
        report.add(CheckResult("example", "FAIL", "failed"))
        self.assertEqual(report.status, "FAIL")
        self.assertEqual(len(report.errors), 1)

    def test_warn_is_visible_without_failing_overall_report(self):
        report = GovernanceReport(release=233, mode="repository", root=".")
        report.add(CheckResult("commit-metadata", "WARN", "browser fallback"))
        self.assertEqual(report.status, "PASS")
        self.assertEqual(len(report.warnings), 1)
        self.assertIn("browser fallback", report.warnings[0])

    def test_inconclusive_check_is_warning_not_failure(self):
        report = GovernanceReport(release=233, mode="package", root=".")
        report.add(CheckResult("remote", "INCONCLUSIVE", "unavailable"))
        self.assertEqual(report.status, "PASS")
        self.assertEqual(len(report.warnings), 1)

    def test_package_attestation_uses_manifest_base_and_not_run_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = base_manifest()
            path = root / "manifest.json"
            write_json(path, payload)
            report = GovernanceReport(release=233, mode="package", root=str(root))
            attestation = build_attestation(
                root,
                ManifestView(path, payload),
                report,
                False,
            )
            self.assertEqual(attestation["commit"]["parent"], payload["base_commit"])
            self.assertEqual(attestation["commit"]["subject"], "NOT_RUN")
            self.assertEqual(attestation["commit"]["body_first_line"], "NOT_RUN")
            self.assertEqual(attestation["commit"]["metadata_mode"], "not-run")
            self.assertFalse(attestation["commit"]["strict_subject"])
            self.assertEqual(attestation["warning_count"], 0)
            self.assertEqual(len(attestation["manifest"]["sha256"]), 64)

    def test_strict_flag_is_recorded_in_package_attestation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = base_manifest()
            path = root / "manifest.json"
            write_json(path, payload)
            report = GovernanceReport(release=233, mode="package", root=str(root))
            attestation = build_attestation(
                root,
                ManifestView(path, payload),
                report,
                False,
                strict_commit_subject=True,
            )
            self.assertTrue(attestation["commit"]["strict_subject"])


if __name__ == "__main__":
    unittest.main()
