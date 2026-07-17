from pathlib import Path
import json,unittest
ROOT=Path(__file__).resolve().parents[2]
class ContractTests(unittest.TestCase):
    def test_workflow_set_is_permanent(self):
        c=json.loads((ROOT/'data/production-baseline.json').read_text(encoding='utf-8'));self.assertEqual(len(c['approvedWorkflows']),6);self.assertTrue(all('release-' not in p for p in c['approvedWorkflows']))
    def test_visual_control_is_permanent(self):
        c=json.loads((ROOT/'data/production-baseline.json').read_text(encoding='utf-8'));self.assertIn('tools/visual_experience/validate.py',c['requiredPermanentControls'])
if __name__=='__main__':unittest.main()
