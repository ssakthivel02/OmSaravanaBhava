from pathlib import Path
import json, tempfile, unittest
from tools.repository_integrity.rules import evaluate_path

ROOT=Path(__file__).resolve().parents[2]
POLICY=json.loads((ROOT/"policies/repository-integrity.json").read_text(encoding="utf-8"))

class FixtureTests(unittest.TestCase):
    def evaluate(self,path):
        payload=json.loads(path.read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            violations=[]
            for rel in payload["paths"]:
                target=root/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b"fixture-content")
                violations.extend(evaluate_path(root,rel,POLICY))
            return "FAIL" if violations else "PASS"

    def test_valid_fixtures(self):
        for path in sorted((ROOT/"fixtures/repository-integrity/valid").glob("*.json")):
            with self.subTest(path=path.name):
                self.assertEqual(self.evaluate(path),"PASS")

    def test_invalid_fixtures(self):
        for path in sorted((ROOT/"fixtures/repository-integrity/invalid").glob("*.json")):
            with self.subTest(path=path.name):
                self.assertEqual(self.evaluate(path),"FAIL")

if __name__ == "__main__":
    unittest.main()
