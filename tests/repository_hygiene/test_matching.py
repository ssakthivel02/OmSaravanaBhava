import unittest
from tools.repository_hygiene.matching import matches_any, normalise_path

class MatchingTests(unittest.TestCase):
    def test_normalise_windows_path(self):
        self.assertEqual(normalise_path(r"tools\x\file.py"), "tools/x/file.py")

    def test_cache_glob_matches(self):
        self.assertEqual(
            matches_any("tools/x/__pycache__/a.pyc", ["**/__pycache__/**"]),
            "**/__pycache__/**",
        )

if __name__ == "__main__":
    unittest.main()
