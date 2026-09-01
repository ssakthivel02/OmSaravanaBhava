from pathlib import Path
import json, unittest
from tools.route_registry.validation import validate_boundary_payload, validate_override_payload
from tools.route_registry.errors import RouteRegistryError
ROOT=Path(__file__).resolve().parents[2]
class ValidationTests(unittest.TestCase):
 def test_canonical_boundaries_pass(self):
  payload=json.loads((ROOT/'fixtures/route-registry/canonical/publication-boundaries.json').read_text(encoding='utf-8'));self.assertEqual(len(validate_boundary_payload(payload)),8)
 def test_canonical_overrides_pass(self):
  payload=json.loads((ROOT/'data/site-routes-effective-overrides.json').read_text(encoding='utf-8'));self.assertEqual(len(validate_override_payload(payload)),8)
 def test_all_invalid_fixtures_fail(self):
  files=sorted((ROOT/'fixtures/route-registry/invalid').glob('*.json'));self.assertEqual(len(files),12)
  for path in files:
   with self.subTest(path=path.name), self.assertRaises(RouteRegistryError): validate_boundary_payload(json.loads(path.read_text(encoding='utf-8')))
if __name__=='__main__': unittest.main()
