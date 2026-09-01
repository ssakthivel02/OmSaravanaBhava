import unittest
from tools.repository_integrity.models import IntegrityReport, IntegrityViolation
from tools.repository_integrity.sarif import to_sarif

class SarifTests(unittest.TestCase):
    def test_violation_is_mapped(self):
        report=IntegrityReport(status="FAIL",tracked_files=1,violations=[IntegrityViolation("x","rule","message")])
        payload=to_sarif(report)
        self.assertEqual(payload["runs"][0]["results"][0]["ruleId"],"rule")

if __name__ == "__main__":
    unittest.main()
