from pathlib import Path
import json
import unittest


ROOT = Path(__file__).resolve().parents[2]


class Release238PackageTests(unittest.TestCase):
    def manifest(self):
        return json.loads(
            (ROOT / "manifest-release-238.json")
            .read_text(encoding="utf-8")
        )

    def test_identity(self):
        manifest = self.manifest()
        self.assertEqual((manifest["release"], manifest["base_release"]), (238, 237))
        self.assertRegex(manifest["base_commit"], r"^[0-9a-f]{40}$")
        self.assertEqual(
            manifest["transaction"]["transaction_base_commit"],
            "b7bc25a3888f5bbe4a55a55ba69fd05ac3cc8e60",
        )

    def test_transaction_titles_are_distinct(self):
        transaction = self.manifest()["transaction"]
        self.assertNotEqual(
            transaction["bootstrap_commit_title"],
            transaction["final_commit_title"],
        )

    def test_finalizer_workflow_has_write_permission(self):
        source = (
            ROOT / ".github/workflows/release-238-finalize.yml"
        ).read_text(encoding="utf-8")
        self.assertIn("contents: write", source)
        self.assertIn("git push origin HEAD:main", source)

    def test_deletion_plan_contains_fourteen_paths(self):
        plan = json.loads(
            (ROOT / "data/release-238-deletion-plan.json")
            .read_text(encoding="utf-8")
        )
        self.assertEqual(len(plan["paths"]), 14)


if __name__ == "__main__":
    unittest.main()
