from pathlib import Path
import tempfile, unittest
from tools.repository_integrity.hashing import file_sha256, payload_sha256

class HashingTests(unittest.TestCase):
    def test_file_hash_is_stable(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/"x.txt";path.write_text("abc\n",encoding="utf-8")
            self.assertEqual(file_sha256(path),file_sha256(path))

    def test_payload_key_order_is_stable(self):
        self.assertEqual(payload_sha256({"a":1,"b":2}),payload_sha256({"b":2,"a":1}))

if __name__ == "__main__":
    unittest.main()
