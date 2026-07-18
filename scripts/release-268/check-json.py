#!/usr/bin/env python3
import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
for p in root.rglob('*.json'):json.loads(p.read_text(encoding='utf-8'))
print('JSON check passed.')
