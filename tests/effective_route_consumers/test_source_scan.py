from pathlib import Path
import tempfile
import unittest

from tools.effective_route_consumers.source_scan import (
    require_import,
    scan_source,
)


class SourceScanTests(unittest.TestCase):
    def test_global_fetch_assignment_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "x.js"
            path.write_text("globalThis.fetch = value;\n", encoding="utf-8")
            findings = scan_source(path, "x.js")
            self.assertEqual(findings[0].rule, "global-fetch-replacement")

    def test_explicit_loader_import_passes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "x.mjs"
            path.write_text(
                "import {loadEffectiveRouteRegistry} from './x.mjs';\n",
                encoding="utf-8",
            )
            self.assertEqual(
                require_import(
                    path,
                    "x.mjs",
                    "loadEffectiveRouteRegistry",
                ),
                [],
            )


if __name__ == "__main__":
    unittest.main()
