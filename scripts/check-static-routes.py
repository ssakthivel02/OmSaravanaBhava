#!/usr/bin/env python3
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
config = json.loads((root / "config/published-routes.json").read_text(encoding="utf-8"))
errors = []
for route in config["routes"]:
    path = route.split("?", 1)[0].lstrip("/")
    target = root / path
    if not target.exists():
        errors.append(f"Missing route target: {route} -> {path}")
if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"Validated {len(config['routes'])} published routes.")
