#!/usr/bin/env python3
import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
d=json.loads((root/'data/release-261/index.json').read_text())
ids=[x['id'] for x in d['records']]
raise SystemExit(1 if len(ids)!=len(set(ids)) else 0)
