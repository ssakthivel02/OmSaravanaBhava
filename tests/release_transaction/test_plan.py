import unittest

from tools.release_transaction.plan import validate_plan


class PlanTests(unittest.TestCase):
    def canonical(self):
        return {
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

    def test_canonical_plan_passes(self):
        self.assertEqual(validate_plan(self.canonical()), [])

    def test_wrong_cache_count_fails(self):
        plan = self.canonical()
        plan["paths"] = plan["paths"][:-1]
        plan["expectedCount"] = 13
        findings = validate_plan(plan)
        self.assertTrue(any(item.rule == "plan-count" for item in findings))


if __name__ == "__main__":
    unittest.main()
