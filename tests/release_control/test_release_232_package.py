from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class Release232HistoricalPackageChecks(unittest.TestCase):
    def test_release_232_manifest_remains_available_as_historical_evidence(self):
        manifest = json.loads(
            (ROOT / "manifest-release-232.json").read_text(encoding="utf-8")
        )
        self.assertEqual(manifest["release"], 232)
        self.assertEqual(manifest["base_release"], 231)
        self.assertEqual(
            manifest["required_commit_title"],
            "Release 232: add deterministic release governance gate",
        )

    def test_release_232_remained_governance_only(self):
        manifest = json.loads(
            (ROOT / "manifest-release-232.json").read_text(encoding="utf-8")
        )
        self.assertFalse(manifest["new_browser_storage_key"])
        self.assertFalse(manifest["content_changes"])
        self.assertEqual(manifest["modified_files"], [])
        self.assertEqual(manifest["deleted_files"], [])
        paths = set(manifest["added_files"])
        self.assertFalse(any(path.endswith(".html") for path in paths))
        self.assertFalse(any(path.startswith("literature/") for path in paths))
        self.assertFalse(any(path.startswith("slokas/") for path in paths))


if __name__ == "__main__":
    unittest.main()
