import unittest
from tools.repository_integrity.paths import first_match, normalise_path

class PathTests(unittest.TestCase):
    def test_windows_separator_normalises(self):
        self.assertEqual(normalise_path(r"tools\x\file.py"), "tools/x/file.py")

    def test_nested_cache_matches(self):
        self.assertEqual(
            first_match("tools/x/__pycache__/a.pyc", ["**/__pycache__/**"]),
            "**/__pycache__/**",
        )

if __name__ == "__main__":
    unittest.main()
