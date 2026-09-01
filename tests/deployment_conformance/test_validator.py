from pathlib import Path
import json
import unittest

from tools.deployment_conformance.validator import validate_deployment


ROOT = Path(__file__).resolve().parents[2]


class ValidatorTests(unittest.TestCase):
    def test_release_package_passes(self):
        policy = json.loads(
            (ROOT / "policies/deployment-conformance.json")
            .read_text(encoding="utf-8")
        )
        contract = json.loads(
            (ROOT / "data/deployment-conformance.json")
            .read_text(encoding="utf-8")
        )
        report = validate_deployment(ROOT, policy, contract)
        self.assertEqual(report["status"], "PASS")


if __name__ == "__main__":
    unittest.main()
