import unittest

from tools.atomic_publisher.plan import (
    expected_changes,
    validate_manifest_plan,
)


POLICY = {
    "requiredBaseCommit":
        "530ad97c68b6e7b8cbe997f2b6bbaf440ec5d527",
    "requiredCommitTitle":
        "Release 239: atomically reconcile repository state and establish verifiable publishing",
    "hardChangedFileLimit": 500,
}


class PlanTests(unittest.TestCase):
    def manifest(self):
        return {
            "release": 239,
            "base_commit": POLICY["requiredBaseCommit"],
            "required_commit_title": POLICY["requiredCommitTitle"],
            "added_files": ["a"],
            "modified_files": ["b"],
            "deleted_files": [f"d{i}" for i in range(14)],
        }

    def test_expected_statuses(self):
        expected = expected_changes(self.manifest())
        self.assertEqual(expected["a"], "A")
        self.assertEqual(expected["b"], "M")
        self.assertEqual(expected["d0"], "D")

    def test_canonical_plan_passes(self):
        self.assertEqual(
            validate_manifest_plan(self.manifest(), POLICY),
            [],
        )


if __name__ == "__main__":
    unittest.main()
