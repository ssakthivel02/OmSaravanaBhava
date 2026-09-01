from pathlib import Path
import tempfile
import unittest

from tools.deployment_conformance.modules import validate_modules


class ModuleTests(unittest.TestCase):
    def test_clean_module_passes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "x.mjs"
            path.write_text("export const value = 1;\n", encoding="utf-8")
            self.assertEqual(validate_modules(root, ["x.mjs"]), [])

    def test_global_fetch_assignment_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "x.js"
            path.write_text("globalThis.fetch = replacement;\n", encoding="utf-8")
            findings = validate_modules(root, ["x.js"])
            self.assertEqual(findings[0].rule, "global-fetch")


if __name__ == "__main__":
    unittest.main()
