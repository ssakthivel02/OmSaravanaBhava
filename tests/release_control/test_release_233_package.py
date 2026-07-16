from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class Release233PackageChecks(unittest.TestCase):
    def test_governance_config_enables_narrow_browser_fallback(self):
        config = json.loads(
            (ROOT / ".release-governance.json").read_text(encoding="utf-8")
        )
        policy = config["commitPolicy"]
        self.assertEqual(config["release"], 233)
        self.assertEqual(policy["mode"], "browser-compatible")
        self.assertTrue(policy["allowBrowserDescriptionFallback"])
        self.assertEqual(
            policy["browserFallbackSubjects"],
            ["Add files via upload"],
        )
        self.assertEqual(policy["bodyTitleMatch"], "first-non-empty-line")
        self.assertEqual(policy["fallbackStatus"], "WARN")
        self.assertLessEqual(config["filePolicy"]["hardLimit"], 500)

    def test_workflow_runs_generic_repository_validator(self):
        workflow = (
            ROOT / ".github/workflows/release-232-governance.yml"
        ).read_text(encoding="utf-8")
        self.assertIn("name: Release Governance Gate", workflow)
        self.assertIn("--repository-mode", workflow)
        self.assertIn("tools.release_control.discovery", workflow)
        self.assertIn("tools/release_validate.py", workflow)
        self.assertIn("steps.manifest.outputs.release", workflow)
        self.assertIn("fetch-depth: 2", workflow)
        self.assertIn("## Warnings", workflow)

    def test_independent_attestation_follows_generic_gate(self):
        workflow = (
            ROOT / ".github/workflows/release-232-attestation.yml"
        ).read_text(encoding="utf-8")
        self.assertIn('workflows: ["Release Governance Gate"]', workflow)
        self.assertIn("tools/release_validate.py", workflow)
        self.assertIn("independent-attestation", workflow)

    def test_release_233_manifest_has_no_site_content_or_storage_change(self):
        manifest = json.loads(
            (ROOT / "manifest-release-233.json").read_text(encoding="utf-8")
        )
        self.assertEqual(manifest["release"], 233)
        self.assertEqual(manifest["base_release"], 232)
        self.assertFalse(manifest["new_browser_storage_key"])
        self.assertFalse(manifest["content_changes"])
        self.assertEqual(manifest["deleted_files"], [])

    def test_no_production_html_or_devotional_data_is_in_release_233(self):
        manifest = json.loads(
            (ROOT / "manifest-release-233.json").read_text(encoding="utf-8")
        )
        paths = set(manifest["added_files"]) | set(manifest["modified_files"])
        self.assertFalse(any(path.endswith(".html") for path in paths))
        self.assertFalse(any(path.startswith("literature/") for path in paths))
        self.assertFalse(any(path.startswith("slokas/") for path in paths))
        self.assertNotIn("service-worker.js", paths)

    def test_exact_and_fallback_modes_are_documented(self):
        policy = (ROOT / "docs/browser-upload-commit-policy.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("exact-subject", policy)
        self.assertIn("browser-description-fallback", policy)
        self.assertIn("--strict-commit-subject", policy)


if __name__ == "__main__":
    unittest.main()
