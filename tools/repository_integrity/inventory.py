"""Deterministic tracked-file inventory."""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

from .hashing import file_sha256, payload_sha256


def build_inventory(root: Path, paths: Iterable[str], release: int) -> dict:
    records = []
    for raw in sorted(set(paths)):
        path = root / raw
        if not path.is_file():
            continue
        records.append({
            "path": raw,
            "sizeBytes": path.stat().st_size,
            "sha256": file_sha256(path),
            "suffix": path.suffix.lower(),
        })
    payload = {
        "release": release,
        "algorithm": "sha256",
        "recordCount": len(records),
        "records": records,
    }
    payload["inventorySha256"] = payload_sha256(payload)
    return payload
