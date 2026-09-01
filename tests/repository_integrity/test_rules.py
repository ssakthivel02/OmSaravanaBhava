from pathlib import Path
import tempfile, unittest
from tools.repository_integrity.rules import evaluate_path

POLICY={
 "forbiddenTrackedPatterns":["**/__pycache__/**","build/**"],
 "forbiddenGeneratedExtensions":[".pyc",".tmp"],
 "maximumTrackedFileBytes":1000,
}

class RuleTests(unittest.TestCase):
    def test_clean_source_passes(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);(root/"x.py").write_text("x=1\n",encoding="utf-8")
            self.assertEqual(evaluate_path(root,"x.py",POLICY),[])

    def test_cache_path_fails(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);p=root/"a/__pycache__/x.pyc";p.parent.mkdir(parents=True);p.write_bytes(b"x")
            self.assertEqual(evaluate_path(root,"a/__pycache__/x.pyc",POLICY)[0].rule,"forbidden-tracked-pattern")

if __name__ == "__main__":
    unittest.main()
