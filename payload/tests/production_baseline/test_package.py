from pathlib import Path
import json, unittest
ROOT=Path(__file__).resolve().parents[2]

class PackageTests(unittest.TestCase):
    def test_identity_and_scale(self):
        m=json.loads((ROOT/'manifest-release-241.json').read_text(encoding='utf-8'))
        self.assertEqual((m['release'],m['base_release']),(241,240))
        self.assertLessEqual(len(m['added_files'])+len(m['modified_files'])+len(m['deleted_files']),500)
        self.assertGreaterEqual(len(m['deleted_files']),240)
    def test_no_browser_publisher_is_committed(self):
        m=json.loads((ROOT/'manifest-release-241.json').read_text(encoding='utf-8'))
        self.assertNotIn('PUBLISH_RELEASE_241.cmd',m['added_files'])

if __name__ == "__main__": unittest.main()
