from pathlib import Path
import unittest
from tools.production_baseline.rules import expected_changes, static_findings

class RuleTests(unittest.TestCase):
    def test_expected_statuses(self):
        manifest={"added_files":["a"],"modified_files":["m"],"deleted_files":["d"]}
        self.assertEqual(expected_changes(manifest), {"a":"A","m":"M","d":"D"})

    def test_legacy_path_is_rejected(self):
        root=Path(__file__).resolve().parents[2]
        policy={"requiredBaseCommit":"x","requiredCommitTitle":"t","hardChangedFileLimit":500,"forbiddenTrackedPatterns":["**/*.pyc"],"allowedRootReleaseFiles":[]}
        contract={"requiredPermanentControls":[],"forbiddenExactPaths":["legacy"],"approvedWorkflows":[],"serviceWorkerRelease":"243"}
        manifest={"release":243,"base_commit":"x","required_commit_title":"t","added_files":[],"modified_files":[],"deleted_files":[]}
        findings=static_findings(root,policy,contract,manifest,{"legacy"})
        self.assertTrue(any(f.rule=="forbidden-exact" for f in findings))

if __name__ == "__main__": unittest.main()
