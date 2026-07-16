from datetime import date
from pathlib import Path
import tempfile, unittest
from tools.repository_hygiene.validator import validate_repository

class ValidatorTests(unittest.TestCase):
    def test_status_changes_on_violation(self):
        policy={"forbiddenTrackedGlobs":["build/**"],"forbiddenExtensions":[],"forbiddenExactPaths":[],"maximumViolations":0}
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);p=root/"build/x";p.parent.mkdir();p.write_text("x",encoding="utf-8")
            report=validate_repository(root,["build/x"],policy,{"entries":[]},today=date(2026,7,16))
            self.assertEqual(report.status,"FAIL")

    def test_allowlisted_path_is_ignored(self):
        policy={"forbiddenTrackedGlobs":["build/**"],"forbiddenExtensions":[],"forbiddenExactPaths":[],"maximumViolations":0}
        allow={"entries":[{"path":"build/x","reason":"temporary","expires":"2026-08-01"}]}
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);p=root/"build/x";p.parent.mkdir();p.write_text("x",encoding="utf-8")
            report=validate_repository(root,["build/x"],policy,allow,today=date(2026,7,16))
            self.assertEqual(report.status,"PASS")

if __name__ == "__main__":
    unittest.main()
