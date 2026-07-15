from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class Release232PackageChecks(unittest.TestCase):
    def test_governance_config_rejects_add_files_subject(self):
        config = json.loads((ROOT / ".release-governance.json").read_text(encoding="utf-8"))
        self.assertIn(
            "Add files via upload",
            config["commitPolicy"]["rejectSubjects"],
        )
        self.assertLessEqual(config["filePolicy"]["hardLimit"], 500)

    def test_workflow_runs_repository_mode_validator(self):
        workflow = (
            ROOT / ".github/workflows/release-232-governance.yml"
        ).read_text(encoding="utf-8")
        self.assertIn("--repository-mode", workflow)
        self.assertIn("tools.release_control.discovery", workflow)
        self.assertIn("steps.manifest.outputs.path", workflow)
        self.assertIn("fetch-depth: 2", workflow)

    def test_manifest_has_no_site_content_or_storage_change(self):
        manifest = json.loads(
            (ROOT / "manifest-release-232.json").read_text(encoding="utf-8")
        )
        self.assertEqual(manifest["release"], 232)
        self.assertEqual(manifest["base_release"], 231)
        self.assertFalse(manifest["new_browser_storage_key"])
        self.assertFalse(manifest["content_changes"])
        self.assertEqual(manifest["modified_files"], [])
        self.assertEqual(manifest["deleted_files"], [])

    def test_no_production_html_or_devotional_data_is_in_manifest(self):
        manifest = json.loads(
            (ROOT / "manifest-release-232.json").read_text(encoding="utf-8")
        )
        paths = set(manifest["added_files"])
        self.assertFalse(any(path.endswith(".html") for path in paths))
        self.assertFalse(any(path.startswith("literature/") for path in paths))
        self.assertFalse(any(path.startswith("slokas/") for path in paths))


if __name__ == "__main__":
    unittest.main()
