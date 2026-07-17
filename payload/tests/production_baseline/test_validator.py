from pathlib import Path
import unittest
from tools.production_baseline.validator import validate

class ValidatorTests(unittest.TestCase):
    def base(self):
        return (
            {"requiredBaseCommit":"base","requiredCommitTitle":"title","hardChangedFileLimit":500,"forbiddenTrackedPatterns":[],"allowedRootReleaseFiles":[]},
            {"requiredPermanentControls":[],"forbiddenExactPaths":[],"approvedWorkflows":[]},
            {"release":241,"base_commit":"base","required_commit_title":"title","added_files":["a"],"modified_files":[],"deleted_files":[]},
        )
    def test_wrong_staged_status_fails(self):
        p,c,m=self.base()
        report=validate(root=Path('.'),policy=p,contract=c,manifest=m,mode='staged',staged={"a":"M"})
        self.assertEqual(report["status"],"FAIL")
    def test_wrong_parent_fails(self):
        p,c,m=self.base()
        report=validate(root=Path('.'),policy=p,contract=c,manifest=m,mode='final',parent='wrong',subject='title')
        self.assertEqual(report["status"],"FAIL")

if __name__ == "__main__": unittest.main()
