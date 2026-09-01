from pathlib import Path
import json, unittest
from tools.route_registry.generator import build_effective_overrides

ROOT=Path(__file__).resolve().parents[2]
class GeneratorTests(unittest.TestCase):
 def setUp(self): self.payload=json.loads((ROOT/'fixtures/route-registry/canonical/publication-boundaries.json').read_text(encoding='utf-8'))
 def test_canonical_output_matches(self):
  expected=json.loads((ROOT/'data/site-routes-effective-overrides.json').read_text(encoding='utf-8'))
  self.assertEqual(build_effective_overrides(self.payload,release=234,generated='2026-07-16'),expected)
 def test_records_are_sorted(self):
  result=build_effective_overrides(self.payload,release=234,generated='2026-07-16')
  paths=[x['path'] for x in result['records']];self.assertEqual(paths,sorted(paths))
 def test_provenance_is_retained(self):
  result=build_effective_overrides(self.payload,release=234,generated='2026-07-16')
  self.assertTrue(all(x['publicationStatusSource']=='/data/publication-boundaries.json' for x in result['records']))
if __name__=='__main__': unittest.main()
