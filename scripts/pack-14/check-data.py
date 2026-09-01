import json
from pathlib import Path
r=Path(__file__).resolve().parents[2];d=json.loads((r/"data/pack-14/index.json").read_text());assert len(d["records"])==1800
