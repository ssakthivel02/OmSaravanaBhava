import json
from pathlib import Path
r=Path(__file__).resolve().parents[2]
for p in r.rglob("*.json"):json.loads(p.read_text())
print("JSON valid")
