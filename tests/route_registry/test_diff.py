import unittest
from tools.route_registry.diff import semantic_diff
class DiffTests(unittest.TestCase):
 def test_added_removed_changed(self):
  before={'records':[{'path':'/a','x':1},{'path':'/b','x':1}]};after={'records':[{'path':'/b','x':2},{'path':'/c','x':1}]}
  self.assertEqual(semantic_diff(before,after),{'added':['/c'],'removed':['/a'],'changed':['/b']})
if __name__=='__main__': unittest.main()
