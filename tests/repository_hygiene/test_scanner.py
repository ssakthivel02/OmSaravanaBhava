from pathlib import Path
import tempfile, unittest
from tools.repository_hygiene.scanner import scan_repository

class ScannerTests(unittest.TestCase):
    def policy(self):
        return {
            "forbiddenTrackedGlobs":["**/__pycache__/**","build/**","artifacts/**"],
            "forbiddenExtensions":[".pyc",".swp"],
            "forbiddenExactPaths":[],
        }

    def test_clean_source_passes(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);(root/"module.py").write_text("x=1\n",encoding="utf-8")
            violations,_=scan_repository(root,["module.py"],self.policy(),set())
            self.assertEqual(violations,[])

    def test_cache_fails(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);p=root/"x/__pycache__/a.pyc";p.parent.mkdir(parents=True);p.write_bytes(b"abc")
            violations,_=scan_repository(root,["x/__pycache__/a.pyc"],self.policy(),set())
            self.assertEqual(len(violations),1)

if __name__ == "__main__":
    unittest.main()
