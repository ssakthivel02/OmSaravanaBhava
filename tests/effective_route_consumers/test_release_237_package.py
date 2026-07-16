from pathlib import Path
import json
import unittest


ROOT = Path(__file__).resolve().parents[2]


class Release237PackageTests(unittest.TestCase):
    def manifest(self):
        return json.loads(
            (ROOT / "manifest-release-237.json")
            .read_text(encoding="utf-8")
        )

    def test_manifest_identity(self):
        manifest = self.manifest()
        self.assertEqual(
            (manifest["release"], manifest["base_release"]),
            (237, 236),
        )
        self.assertEqual(
            manifest["base_commit"],
            "dfc5ce53229d9af53a99fe9a089d5d29bb3ea9b5",
        )

    def test_cache_cleanup_is_declared_again(self):
        manifest = self.manifest()
        caches = [
            path for path in manifest["deleted_files"]
            if "__pycache__" in path
        ]
        self.assertEqual(len(caches), 13)

    def test_legacy_site_directory_script_is_deleted(self):
        manifest = self.manifest()
        self.assertIn(
            "assets/js/site-directory.js",
            manifest["deleted_files"],
        )

    def test_public_consumers_are_modified(self):
        manifest = self.manifest()
        for path in [
            "content-status.html",
            "discovery.html",
            "site-directory.html",
            "assets/js/content-status-audit.mjs",
            "assets/js/discovery-workspace.mjs",
            "assets/js/route-status-reconciliation.js",
        ]:
            self.assertIn(path, manifest["modified_files"])

    def test_auto_clone_publisher_exists(self):
        self.assertTrue((ROOT / "PUBLISH_RELEASE_237.cmd").is_file())
        source = (
            ROOT / "scripts/release237/publish-release-237.ps1"
        ).read_text(encoding="utf-8")
        self.assertIn("git clone", source)
        self.assertIn("verify-staged-change-set.py", source)


if __name__ == "__main__":
    unittest.main()
