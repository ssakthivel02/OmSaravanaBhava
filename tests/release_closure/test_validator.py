from pathlib import Path
import tempfile, unittest
from tools.release_closure.validator import validate_closure
TARGETS=["assets/js/site-directory.js",*[f"x/__pycache__/c{i}.pyc" for i in range(13)]]
POLICY={"approvedBaseCommit":"a"*40,"maximumFinalChangedFiles":500}
CONTRACT={"release":240,"approvedBaseCommit":"a"*40,"browserStageSubjectEnforced":False}
PLAN={"release":240,"expectedCount":14,"paths":TARGETS}
class ValidatorTests(unittest.TestCase):
    def test_pending_passes_with_targets(self):
        with tempfile.TemporaryDirectory() as d:
            r=validate_closure(root=Path(d),policy=POLICY,contract=CONTRACT,plan=PLAN,mode="pending",tracked_paths=set(TARGETS)); self.assertEqual(r["status"],"PASS")
    def test_staged_exact_passes(self):
        changes={p:"D" for p in TARGETS}; changes.update({"RELEASE_240_CLOSURE_RESULT.json":"A",".release-governance.json":"M","data/release-240-closure.json":"M","manifest-release-240.json":"M","RELEASE_240_SHA256SUMS.txt":"M"})
        with tempfile.TemporaryDirectory() as d:
            r=validate_closure(root=Path(d),policy=POLICY,contract=CONTRACT,plan=PLAN,mode="staged",staged_changes=changes); self.assertEqual(r["status"],"PASS")
if __name__=="__main__": unittest.main()
