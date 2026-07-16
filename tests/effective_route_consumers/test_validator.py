from pathlib import Path
import json
import shutil
import tempfile
import unittest

from tools.effective_route_consumers.validator import (
    validate_effective_route_consumers,
)


ROOT = Path(__file__).resolve().parents[2]


class ValidatorTests(unittest.TestCase):
    def test_release_package_passes(self):
        policy = json.loads(
            (
                ROOT / "policies/effective-route-consumers.json"
            ).read_text(encoding="utf-8")
        )
        runtime = json.loads(
            (
                ROOT / "data/effective-route-registry-runtime.json"
            ).read_text(encoding="utf-8")
        )
        report = validate_effective_route_consumers(
            ROOT,
            policy,
            runtime,
        )
        self.assertEqual(report["status"], "PASS")
        self.assertEqual(report["findingCount"], 0)

    def test_legacy_directory_script_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for relative in [
                "assets/js/effective-route-registry.mjs",
                "assets/js/content-status-audit.mjs",
                "assets/js/discovery-workspace.mjs",
                "assets/js/site-directory.mjs",
                "assets/js/route-status-reconciliation.js",
                "content-status.html",
                "discovery.html",
                "site-directory.html",
            ]:
                source = ROOT / relative
                destination = root / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)
            legacy = root / "assets/js/site-directory.js"
            legacy.write_text("legacy\n", encoding="utf-8")
            policy = {
                "loader": "assets/js/effective-route-registry.mjs",
                "compatibilityHelper":
                    "assets/js/route-status-reconciliation.js",
                "consumers": {
                    "content-status.html":
                        "assets/js/content-status-audit.mjs",
                    "discovery.html":
                        "assets/js/discovery-workspace.mjs",
                    "site-directory.html":
                        "assets/js/site-directory.mjs",
                },
            }
            runtime = {
                "release": 237,
                "globalFetchInterception": False,
                "consumers": ["/a", "/b", "/c"],
            }
            report = validate_effective_route_consumers(
                root,
                policy,
                runtime,
            )
            self.assertEqual(report["status"], "FAIL")
            self.assertTrue(
                any(
                    item["rule"] == "legacy-consumer-remains"
                    for item in report["findings"]
                )
            )


if __name__ == "__main__":
    unittest.main()
