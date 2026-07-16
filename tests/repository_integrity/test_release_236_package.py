from pathlib import Path
import json, unittest

ROOT=Path(__file__).resolve().parents[2]

class Release236PackageTests(unittest.TestCase):
    def test_manifest_identity(self):
        manifest=json.loads((ROOT/"manifest-release-236.json").read_text(encoding="utf-8"))
        self.assertEqual((manifest["release"],manifest["base_release"]),(236,235))

    def test_thirteen_cache_deletions_are_declared(self):
        manifest=json.loads((ROOT/"manifest-release-236.json").read_text(encoding="utf-8"))
        self.assertEqual(len(manifest["deleted_files"]),13)
        self.assertTrue(all("__pycache__" in path for path in manifest["deleted_files"]))

    def test_windows_installer_targets_external_repository(self):
        text=(ROOT/"APPLY_RELEASE_236.cmd").read_text(encoding="utf-8")
        self.assertIn("REPOSITORY_ROOT",text)
        self.assertIn("PACKAGE_ROOT",text)
        self.assertIn(".git",text)

    def test_powershell_installer_applies_binary_patch(self):
        text=(ROOT/"scripts/release236/apply-release-236.ps1").read_text(encoding="utf-8")
        self.assertIn("git apply --index --binary",text)
        self.assertIn("Copy-Item",text)

    def test_installer_line_endings_are_deterministic(self):
        attributes=(ROOT/".gitattributes").read_text(encoding="utf-8")
        self.assertIn("APPLY_RELEASE_236.cmd text eol=lf",attributes)
        self.assertIn("scripts/release236/*.ps1 text eol=lf",attributes)
        powershell=(ROOT/"scripts/release236/apply-release-236.ps1").read_text(encoding="utf-8")
        self.assertIn("git checkout-index -f",powershell)

    def test_integrity_workflow_exists(self):
        text=(ROOT/".github/workflows/repository-integrity.yml").read_text(encoding="utf-8")
        self.assertIn("tools.repository_integrity.validate",text)

if __name__ == "__main__":
    unittest.main()
