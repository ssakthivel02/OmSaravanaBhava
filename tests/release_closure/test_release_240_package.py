from pathlib import Path
import json, unittest
ROOT=Path(__file__).resolve().parents[2]
class PackageTests(unittest.TestCase):
    def test_manifest_identity(self):
        m=json.loads((ROOT/"manifest-release-240.json").read_text(encoding="utf-8")); self.assertEqual((m["release"],m["base_release"]),(240,239)); self.assertEqual(m["bootstrap_base_commit"],"546830197db7dddca9ab0cf8aaf62595ab3bc07f")
    def test_workflow_ignores_stage_subject(self):
        s=(ROOT/".github/workflows/release-240-closure.yml").read_text(encoding="utf-8"); self.assertNotIn("verify-stage-title",s); self.assertIn("contents: write",s)
    def test_plan_exceeds_fourteen_for_obsolete_cleanup(self):
        p=json.loads((ROOT/"data/release-240-deletion-plan.json").read_text(encoding="utf-8")); self.assertGreater(len(p["paths"]),14)
if __name__=="__main__": unittest.main()
