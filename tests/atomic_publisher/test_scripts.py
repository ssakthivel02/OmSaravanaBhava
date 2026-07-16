from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]


class ScriptTests(unittest.TestCase):
    def test_prepare_script_uses_git_rm(self):
        source = (
            ROOT / "scripts/release239/prepare-checkout.py"
        ).read_text(encoding="utf-8")
        self.assertIn('"git", "rm"', source)
        self.assertIn("Deletion targets are not tracked", source)

    def test_publisher_requires_exact_base(self):
        source = (
            ROOT / "scripts/release239/verify-base.py"
        ).read_text(encoding="utf-8")
        self.assertIn(
            "530ad97c68b6e7b8cbe997f2b6bbaf440ec5d527",
            source,
        )


if __name__ == "__main__":
    unittest.main()
