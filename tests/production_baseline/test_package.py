from pathlib import Path
import json, unittest
ROOT=Path(__file__).resolve().parents[2]

class PackageTests(unittest.TestCase):
    def test_identity_and_scale(self):
        m=json.loads((ROOT/'manifest-release-244.json').read_text(encoding='utf-8'))
        self.assertEqual((m['release'],m['base_release']),(244,243))
        self.assertEqual(m['base_commit'],'2e8b4d2d4a47931757423906015e586eafcd26a3')
        self.assertLessEqual(len(m['added_files'])+len(m['modified_files'])+len(m['deleted_files']),500)
        self.assertEqual(len(m['deleted_files']),2)
        self.assertEqual(m['scope']['operational_controls'],60)
    def test_no_browser_publisher_is_committed(self):
        m=json.loads((ROOT/'manifest-release-244.json').read_text(encoding='utf-8'))
        self.assertFalse(any('PUBLISH_RELEASE_244' in p or 'RUN_RELEASE_244' in p for p in m['added_files']))
        self.assertFalse(m['scope']['analytics_added'])

if __name__ == "__main__": unittest.main()
