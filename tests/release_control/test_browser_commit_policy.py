from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class BrowserCommitPolicyStaticChecks(unittest.TestCase):
    def test_powershell_metadata_script_checks_first_body_line(self):
        text = (
            ROOT / "scripts/release/check-commit-metadata.ps1"
        ).read_text(encoding="utf-8")
        self.assertIn("Select-Object -First 1", text)
        self.assertIn("Add files via upload", text)
        self.assertIn("[switch]$Strict", text)

    def test_shell_metadata_script_supports_strict_mode(self):
        text = (
            ROOT / "scripts/release/check-commit-metadata.sh"
        ).read_text(encoding="utf-8")
        self.assertIn('mode="${2:-browser-compatible}"', text)
        self.assertIn('"$mode" != "strict"', text)
        self.assertIn("body_first", text)

    def test_local_publishers_commit_manifest_title(self):
        powershell = (
            ROOT / "scripts/release/publish-release.ps1"
        ).read_text(encoding="utf-8")
        shell = (
            ROOT / "scripts/release/publish-release.sh"
        ).read_text(encoding="utf-8")
        self.assertIn("git commit -m $title", powershell)
        self.assertIn('git commit -m "$title"', shell)
        self.assertIn("base_commit", powershell)
        self.assertIn("base_commit", shell)

    def test_preflight_scripts_discover_latest_manifest(self):
        powershell = (
            ROOT / "scripts/release/preflight.ps1"
        ).read_text(encoding="utf-8")
        shell = (
            ROOT / "scripts/release/preflight.sh"
        ).read_text(encoding="utf-8")
        self.assertIn("tools.release_control.discovery", powershell)
        self.assertIn("tools/release_validate.py", powershell)
        self.assertIn("tools.release_control.discovery", shell)
        self.assertIn("tools/release_validate.py", shell)

    def test_strict_compatibility_wrappers_delegate_to_metadata_check(self):
        powershell = (
            ROOT / "scripts/release/check-commit-title.ps1"
        ).read_text(encoding="utf-8")
        shell = (
            ROOT / "scripts/release/check-commit-title.sh"
        ).read_text(encoding="utf-8")
        self.assertIn("check-commit-metadata.ps1", powershell)
        self.assertIn("-Strict", powershell)
        self.assertIn("check-commit-metadata.sh", shell)
        self.assertIn("strict", shell)


if __name__ == "__main__":
    unittest.main()
