from pathlib import Path
import json, unittest

ROOT=Path(__file__).resolve().parents[2]

class Release235PackageTests(unittest.TestCase):
    def test_manifest_declares_cache_deletions(self):
        manifest=json.loads((ROOT/"manifest-release-235.json").read_text(encoding="utf-8"))
        self.assertEqual(len(manifest["deleted_files"]),13)
        self.assertTrue(all("__pycache__" in path for path in manifest["deleted_files"]))

    def test_ignore_file_blocks_bytecode(self):
        text=(ROOT/".gitignore").read_text(encoding="utf-8")
        self.assertIn("__pycache__/",text)
        self.assertIn("*.py[cod]",text)

    def test_hygiene_workflow_exists(self):
        text=(ROOT/".github/workflows/repository-hygiene.yml").read_text(encoding="utf-8")
        self.assertIn("tools.repository_hygiene.validate",text)

if __name__ == "__main__":
    unittest.main()
