from pathlib import Path
import json, unittest
ROOT=Path(__file__).resolve().parents[2]
class Release234PackageTests(unittest.TestCase):
 def test_manifest_identity(self):
  m=json.loads((ROOT/'manifest-release-234.json').read_text(encoding='utf-8'));self.assertGreaterEqual(m['release'],234);self.assertGreaterEqual(m['base_release'],233)
 def test_historical_registry_not_changed(self):
  m=json.loads((ROOT/'manifest-release-234.json').read_text(encoding='utf-8'));self.assertNotIn('data/site-routes.json',m['modified_files'])
 def test_override_count(self):
  p=json.loads((ROOT/'data/site-routes-effective-overrides.json').read_text(encoding='utf-8'));self.assertEqual(p['recordCount'],8)
 def test_no_site_content_change(self):
  m=json.loads((ROOT/'manifest-release-234.json').read_text(encoding='utf-8'));self.assertFalse(m['content_changes']);self.assertFalse(m['new_public_route'])
if __name__=='__main__': unittest.main()
