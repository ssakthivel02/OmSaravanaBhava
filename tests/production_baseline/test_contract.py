from pathlib import Path
import json, unittest
ROOT=Path(__file__).resolve().parents[2]

class ContractTests(unittest.TestCase):
    def test_workflow_set_is_permanent(self):
        c=json.loads((ROOT/'data/production-baseline.json').read_text(encoding='utf-8'))
        self.assertEqual(len(c['approvedWorkflows']),6)
        self.assertIn('.github/workflows/operations-observability.yml',c['approvedWorkflows'])
        self.assertTrue(all('release-' not in p for p in c['approvedWorkflows']))
    def test_forbidden_scope_contains_legacy_script_and_cache_policy(self):
        c=json.loads((ROOT/'data/production-baseline.json').read_text(encoding='utf-8'))
        p=json.loads((ROOT/'policies/production-baseline.json').read_text(encoding='utf-8'))
        self.assertIn('assets/js/site-directory.js',c['forbiddenExactPaths'])
        self.assertIn('**/__pycache__/**',p['forbiddenTrackedPatterns'])

if __name__ == "__main__": unittest.main()
