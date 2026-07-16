from pathlib import Path
import json, tempfile, unittest
from tools.repository_hygiene.validator import validate_repository

ROOT=Path(__file__).resolve().parents[2]
POLICY=json.loads((ROOT/"policies/repository-hygiene.json").read_text(encoding="utf-8"))

class FixtureTests(unittest.TestCase):
    def run_fixture(self,path):
        payload=json.loads(path.read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            for rel in payload["paths"]:
                target=root/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b"fixture-data")
            return validate_repository(root,payload["paths"],POLICY,{"entries":[]})

    def test_valid_fixtures_pass(self):
        for path in sorted((ROOT/"fixtures/repository-hygiene/valid").glob("*.json")):
            with self.subTest(path=path.name):
                self.assertEqual(self.run_fixture(path).status,"PASS")

    def test_invalid_fixtures_fail(self):
        for path in sorted((ROOT/"fixtures/repository-hygiene/invalid").glob("*.json")):
            with self.subTest(path=path.name):
                self.assertEqual(self.run_fixture(path).status,"FAIL")

if __name__ == "__main__":
    unittest.main()
