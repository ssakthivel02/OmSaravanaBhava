from datetime import date
import unittest
from tools.repository_integrity.allowlist import active_allowlist

class AllowlistTests(unittest.TestCase):
    def test_active_exception(self):
        payload={"entries":[{"path":"x","reason":"migration","expires":"2026-08-01"}]}
        self.assertEqual(active_allowlist(payload,date(2026,7,16)),{"x"})

    def test_expired_exception(self):
        payload={"entries":[{"path":"x","reason":"migration","expires":"2026-07-01"}]}
        self.assertEqual(active_allowlist(payload,date(2026,7,16)),set())

if __name__ == "__main__":
    unittest.main()
