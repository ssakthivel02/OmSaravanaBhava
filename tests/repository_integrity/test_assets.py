from pathlib import Path
import tempfile, unittest
from tools.repository_integrity.assets import check_required_assets

class AssetTests(unittest.TestCase):
    def test_missing_asset_fails(self):
        with tempfile.TemporaryDirectory() as d:
            result=check_required_assets(Path(d),{"requiredGovernanceAssets":["x.json"]})
            self.assertEqual(result[0].rule,"missing-governance-asset")

    def test_existing_asset_passes(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);(root/"x.json").write_text("{}\n",encoding="utf-8")
            self.assertEqual(check_required_assets(root,{"requiredGovernanceAssets":["x.json"]}),[])

if __name__ == "__main__":
    unittest.main()
