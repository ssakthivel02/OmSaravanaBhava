import unittest
from tools.route_registry.provenance import provenance_record
class ProvenanceTests(unittest.TestCase):
 def test_projection(self):
  item={'path':'/x','publicationStatusSource':'/s','publicationBoundaryRelease':1,'sourceDataPath':'/d','evidenceMarker':'e'}
  self.assertEqual(provenance_record(item)['sourceRelease'],1)
if __name__=='__main__': unittest.main()
