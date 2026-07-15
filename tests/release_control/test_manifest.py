from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.release_control.checks_manifest import check_manifest
from tools.release_control.models import ManifestView
from tests.release_control.support import base_config, base_manifest, write_json


class ManifestChecks(unittest.TestCase):
    def evaluate(self, payload=None, config=None):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manifest.json"
            data = payload or base_manifest()
            write_json(path, data)
            return check_manifest(
                ManifestView(path, data),
                config or base_config(),
            )

    def result(self, results, name):
        return next(item for item in results if item.name == name)

    def test_valid_manifest_passes_core_contract(self):
        results = self.evaluate()
        self.assertTrue(all(item.status == "PASS" for item in results))

    def test_missing_required_field_fails(self):
        payload = base_manifest()
        payload.pop("production_objective")
        result = self.result(self.evaluate(payload), "manifest-required-fields")
        self.assertEqual(result.status, "FAIL")

    def test_non_contiguous_release_sequence_fails(self):
        payload = base_manifest()
        payload["base_release"] = 230
        result = self.result(self.evaluate(payload), "manifest-release-sequence")
        self.assertEqual(result.status, "FAIL")

    def test_base_commit_must_match_configuration(self):
        payload = base_manifest()
        payload["base_commit"] = "b" * 40
        result = self.result(self.evaluate(payload), "manifest-base-commit")
        self.assertEqual(result.status, "FAIL")

    def test_required_title_must_be_exact(self):
        payload = base_manifest()
        payload["required_commit_title"] += " extra"
        result = self.result(self.evaluate(payload), "manifest-required-title")
        self.assertEqual(result.status, "FAIL")

    def test_duplicate_path_across_lists_fails(self):
        payload = base_manifest()
        payload["added_files"] = ["one.txt"]
        payload["modified_files"] = ["one.txt"]
        result = self.result(self.evaluate(payload), "manifest-path-safety")
        self.assertEqual(result.status, "FAIL")

    def test_parent_path_escape_fails(self):
        payload = base_manifest()
        payload["added_files"] = ["../outside.txt"]
        result = self.result(self.evaluate(payload), "manifest-path-safety")
        self.assertEqual(result.status, "FAIL")

    def test_limitations_are_required(self):
        payload = base_manifest()
        payload["known_limitations"] = []
        result = self.result(self.evaluate(payload), "manifest-limitations")
        self.assertEqual(result.status, "FAIL")


if __name__ == "__main__":
    unittest.main()
