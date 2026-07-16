import unittest
from tools.route_registry.fingerprint import payload_sha256
class FingerprintTests(unittest.TestCase):
 def test_key_order_does_not_change_fingerprint(self): self.assertEqual(payload_sha256({'a':1,'b':2}),payload_sha256({'b':2,'a':1}))
 def test_value_change_changes_fingerprint(self): self.assertNotEqual(payload_sha256({'a':1}),payload_sha256({'a':2}))
if __name__=='__main__': unittest.main()
