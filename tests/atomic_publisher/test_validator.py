from pathlib import Path
import tempfile
import unittest

from tools.atomic_publisher.validator import (
    validate_atomic_publish_plan,
)


BASE = "530ad97c68b6e7b8cbe997f2b6bbaf440ec5d527"
TITLE = "Release 239: atomically reconcile repository state and establish verifiable publishing"
DELETED = [f"d{i}" for i in range(14)]
POLICY = {
    "requiredBaseCommit": BASE,
    "requiredCommitTitle": TITLE,
    "hardChangedFileLimit": 500,
}
CONTRACT = {
    "release": 239,
    "baseCommit": BASE,
    "browserUploadAllowed": False,
}
MANIFEST = {
    "release": 239,
    "base_commit": BASE,
    "required_commit_title": TITLE,
    "added_files": ["a"],
    "modified_files": ["b"],
    "deleted_files": DELETED,
}


class ValidatorTests(unittest.TestCase):
    def test_exact_staged_state_passes(self):
        staged = {"a": "A", "b": "M", **{p: "D" for p in DELETED}}
        with tempfile.TemporaryDirectory() as directory:
            report = validate_atomic_publish_plan(
                root=Path(directory),
                policy=POLICY,
                contract=CONTRACT,
                manifest=MANIFEST,
                staged_changes=staged,
            )
        self.assertEqual(report["status"], "PASS")

    def test_remaining_deletion_target_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            report = validate_atomic_publish_plan(
                root=Path(directory),
                policy=POLICY,
                contract=CONTRACT,
                manifest=MANIFEST,
                tracked_after={DELETED[0]},
            )
        self.assertEqual(report["status"], "FAIL")
        self.assertTrue(any(
            item["rule"] == "deletion-target-remains"
            for item in report["findings"]
        ))


if __name__ == "__main__":
    unittest.main()
