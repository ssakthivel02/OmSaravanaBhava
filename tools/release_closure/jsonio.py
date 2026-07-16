import json
from pathlib import Path
def load_json(path: Path):
    payload=json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict): raise ValueError(f"Expected JSON object: {path}")
    return payload
def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")
