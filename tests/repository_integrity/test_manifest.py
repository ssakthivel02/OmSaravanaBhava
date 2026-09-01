import unittest
from tools.repository_integrity.manifest import check_manifest

POLICY={"requiredManifestFields":["release","added_files","modified_files","deleted_files"]}

class ManifestTests(unittest.TestCase):
    def test_missing_field_fails(self):
        result=check_manifest({"release":236},POLICY,"manifest.json")
        self.assertTrue(any(x.rule=="manifest-field-missing" for x in result))

    def test_duplicate_path_fails(self):
        payload={"release":236,"added_files":["x"],"modified_files":["x"],"deleted_files":[]}
        result=check_manifest(payload,POLICY,"manifest.json")
        self.assertTrue(any(x.rule=="manifest-duplicate-path" for x in result))

if __name__ == "__main__":
    unittest.main()
