from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.release_control.discovery import find_latest_manifest, release_number


class ManifestDiscoveryChecks(unittest.TestCase):
    def test_release_number_parses_numeric_manifest(self):
        self.assertEqual(release_number(Path("manifest-release-232.json")), 232)
        self.assertIsNone(release_number(Path("manifest-release-latest.json")))

    def test_latest_numeric_manifest_is_selected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for number in (229, 232, 231):
                (root / f"manifest-release-{number}.json").write_text(
                    "{}\n", encoding="utf-8"
                )
            self.assertEqual(
                find_latest_manifest(root).name,
                "manifest-release-232.json",
            )

    def test_missing_manifest_raises(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(FileNotFoundError):
                find_latest_manifest(Path(directory))


if __name__ == "__main__":
    unittest.main()
