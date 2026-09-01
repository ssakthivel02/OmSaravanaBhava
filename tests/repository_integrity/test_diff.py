import unittest
from tools.repository_integrity.diff import inventory_diff

class DiffTests(unittest.TestCase):
    def test_added_removed_changed(self):
        before={"records":[{"path":"a","sha256":"1"},{"path":"b","sha256":"1"}]}
        after={"records":[{"path":"b","sha256":"2"},{"path":"c","sha256":"1"}]}
        self.assertEqual(inventory_diff(before,after),{"added":["c"],"removed":["a"],"changed":["b"]})

if __name__ == "__main__":
    unittest.main()
