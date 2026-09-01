import json
from pathlib import Path
r=Path(__file__).resolve().parents[2]
for p in (r/'data/release-281').rglob('*.json'):json.loads(p.read_text())
json.loads((r/'config/release-281/deployment-contract.json').read_text())
print('JSON valid')