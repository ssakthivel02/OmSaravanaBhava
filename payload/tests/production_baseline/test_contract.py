from pathlib import Path
import json, unittest
ROOT=Path(__file__).resolve().parents[2]

class ContractTests(unittest.TestCase):
    def test_workflow_set_is_permanent(self):
        c=json.loads((ROOT/'data/production-baseline.json').read_text(encoding='utf-8'))
        self.assertEqual(len(c['approvedWorkflows']),5)
        self.assertTrue(all('release-' not in p for p in c['approvedWorkflows']))
    def test_forbidden_scope_contains_cache_and_legacy_script(self):
        c=json.loads((ROOT/'data/production-baseline.json').read_text(encoding='utf-8'))
        self.assertIn('assets/js/site-directory.js',c['forbiddenExactPaths'])
        self.assertTrue(any('__pycache__' in p for p in c['forbiddenExactPaths']))

if __name__ == "__main__": unittest.main()
