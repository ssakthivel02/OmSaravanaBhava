from pathlib import Path
import tempfile, unittest
from tools.repository_integrity.inventory import build_inventory

class InventoryTests(unittest.TestCase):
    def test_inventory_is_sorted_and_counted(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/"b.txt").write_text("b",encoding="utf-8")
            (root/"a.txt").write_text("a",encoding="utf-8")
            payload=build_inventory(root,["b.txt","a.txt"],236)
            self.assertEqual([x["path"] for x in payload["records"]],["a.txt","b.txt"])
            self.assertEqual(payload["recordCount"],2)
            self.assertEqual(len(payload["inventorySha256"]),64)

if __name__ == "__main__":
    unittest.main()
