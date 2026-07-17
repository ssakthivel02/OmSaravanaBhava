from pathlib import Path
import unittest
from tools.operations_observability.validate import validate_repository
ROOT=Path(__file__).resolve().parents[2]
class Tests(unittest.TestCase):
 def test_catalog_shape(self):
  report=validate_repository(ROOT,"package")
  self.assertEqual(60,report["checkCount"])
  self.assertEqual(36,report["automatedCount"])
  self.assertEqual(24,report["advisoryCount"])
if __name__=="__main__":unittest.main()
