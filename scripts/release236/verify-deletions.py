#!/usr/bin/env python3
from pathlib import Path
import json

root = Path(".")
payload = json.loads(
    (root / "policies/repository-integrity-cleanup.json").read_text(encoding="utf-8")
)
remaining = [
    path for path in payload["trackedPathsToDelete"]
    if (root / path).exists()
]
if remaining:
    raise SystemExit("Tracked cache files remain: " + ", ".join(remaining))
print("All declared tracked-cache files are absent.")
