import unittest

from tools.effective_route_consumers.runtime import validate_runtime


class RuntimeTests(unittest.TestCase):
    def test_canonical_runtime_passes(self):
        payload = {
            "release": 237,
            "globalFetchInterception": False,
            "consumers": ["/a", "/b", "/c"],
        }
        self.assertEqual(validate_runtime(payload, "runtime.json"), [])

    def test_global_fetch_interception_fails(self):
        payload = {
            "release": 237,
            "globalFetchInterception": True,
            "consumers": ["/a", "/b", "/c"],
        }
        findings = validate_runtime(payload, "runtime.json")
        self.assertEqual(findings[0].rule, "runtime-fetch-policy")


if __name__ == "__main__":
    unittest.main()
