import unittest

from tools.release_transaction.state import (
    validate_bootstrap,
    validate_final,
)


POLICY = {
    "transactionBaseCommit":
        "b7bc25a3888f5bbe4a55a55ba69fd05ac3cc8e60",
    "bootstrapCommitTitle":
        "Bootstrap Release 238: install browser-safe finalizer and deployment conformance",
    "finalCommitTitle":
        "Release 238: reconcile repository state and enforce deployment conformance",
}


class StateTests(unittest.TestCase):
    def test_bootstrap_passes(self):
        self.assertEqual(validate_bootstrap(
            parent=POLICY["transactionBaseCommit"],
            subject=POLICY["bootstrapCommitTitle"],
            policy=POLICY,
        ), [])

    def test_final_parent_is_enforced(self):
        findings = validate_final(
            parent="wrong",
            subject=POLICY["finalCommitTitle"],
            bootstrap_commit="bootstrap",
            policy=POLICY,
        )
        self.assertEqual(findings[0].rule, "final-parent")


if __name__ == "__main__":
    unittest.main()
