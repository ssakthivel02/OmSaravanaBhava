from pathlib import Path
import unittest
from tools.visual_experience.validate import validate
ROOT=Path(__file__).resolve().parents[2]
class Tests(unittest.TestCase):
    def test_release_245_visual_contract(self): self.assertEqual(validate(ROOT)['status'],'PASS')
if __name__=='__main__':unittest.main()
