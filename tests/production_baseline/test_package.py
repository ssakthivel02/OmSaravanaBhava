from pathlib import Path
import json,unittest
ROOT=Path(__file__).resolve().parents[2]
class PackageTests(unittest.TestCase):
    def test_identity_and_scale(self):
        m=json.loads((ROOT/'manifest-release-245.json').read_text(encoding='utf-8'));self.assertEqual((m['release'],m['base_release']),(245,244));self.assertLessEqual(len(m['added_files'])+len(m['modified_files'])+len(m['deleted_files']),500)
    def test_controlled_retirements(self):
        m=json.loads((ROOT/'manifest-release-245.json').read_text(encoding='utf-8'));self.assertEqual(set(m['deleted_files']),{'PRODUCTION_BASELINE_244.json','manifest-release-244.json','data/operations/release-244.json'})
if __name__=='__main__':unittest.main()
