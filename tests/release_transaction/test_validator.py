from pathlib import Path
import tempfile
import unittest

from tools.release_transaction.validator import validate_transaction


POLICY = {
    "transactionBaseCommit":
        "b7bc25a3888f5bbe4a55a55ba69fd05ac3cc8e60",
    "bootstrapCommitTitle":
        "Bootstrap Release 238: install browser-safe finalizer and deployment conformance",
    "finalCommitTitle":
        "Release 238: reconcile repository state and enforce deployment conformance",
    "finalizationResult": "RELEASE_238_FINALIZATION_RESULT.json",
}
TRANSACTION = {
    "release": 238,
    "transactionBaseCommit": POLICY["transactionBaseCommit"],
}
PLAN = {
    "release": 238,
    "expectedCount": 14,
    "paths": [
        "assets/js/site-directory.js",
        *[
            f"tools/release_control/__pycache__/x{i}.pyc"
            for i in range(13)
        ],
    ],
}


class ValidatorTests(unittest.TestCase):
    def test_bootstrap_requires_all_targets(self):
        with tempfile.TemporaryDirectory() as directory:
            report = validate_transaction(
                root=Path(directory),
                policy=POLICY,
                transaction=TRANSACTION,
                plan=PLAN,
                mode="bootstrap",
                parent=POLICY["transactionBaseCommit"],
                subject=POLICY["bootstrapCommitTitle"],
                tracked_paths=set(PLAN["paths"]),
            )
            self.assertEqual(report["status"], "PASS")

    def test_final_requires_result(self):
        with tempfile.TemporaryDirectory() as directory:
            report = validate_transaction(
                root=Path(directory),
                policy=POLICY,
                transaction=TRANSACTION,
                plan=PLAN,
                mode="final",
                parent="bootstrap",
                subject=POLICY["finalCommitTitle"],
                bootstrap_commit="bootstrap",
                tracked_paths=set(),
            )
            self.assertEqual(report["status"], "FAIL")
            self.assertTrue(any(
                item["rule"] == "final-result"
                for item in report["findings"]
            ))


if __name__ == "__main__":
    unittest.main()
