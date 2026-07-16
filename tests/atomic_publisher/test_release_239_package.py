from pathlib import Path
import json
import unittest


ROOT = Path(__file__).resolve().parents[2]


class Release239PackageTests(unittest.TestCase):
    def manifest(self):
        return json.loads(
            (ROOT / "manifest-release-239.json")
            .read_text(encoding="utf-8")
        )

    def test_identity(self):
        manifest = self.manifest()
        self.assertEqual((manifest["release"], manifest["base_release"]), (239, 238))
        self.assertEqual(
            manifest["base_commit"],
            "530ad97c68b6e7b8cbe997f2b6bbaf440ec5d527",
        )

    def test_fourteen_deletions(self):
        manifest = self.manifest()
        self.assertEqual(len(manifest["deleted_files"]), 14)
        self.assertIn(
            "assets/js/site-directory.js",
            manifest["deleted_files"],
        )

    def test_windows_publisher_is_fresh_clone(self):
        source = (
            ROOT / "scripts/release239/publish-release-239.ps1"
        ).read_text(encoding="utf-8")
        self.assertIn("git clone", source)
        self.assertIn("verify-staged-change-set.py", source)
        self.assertIn("git push origin", source)

    def test_browser_upload_is_forbidden(self):
        contract = json.loads(
            (ROOT / "data/atomic-publisher.json")
            .read_text(encoding="utf-8")
        )
        self.assertFalse(contract["browserUploadAllowed"])


if __name__ == "__main__":
    unittest.main()
