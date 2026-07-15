"""JSON, hashing and path-safety helpers."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

from .constants import SHA256_PATTERN


def load_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return payload


def dump_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def safe_relative_path(value: str) -> bool:
    path = Path(value)
    if not value or path.is_absolute():
        return False
    return ".." not in path.parts and "\\" not in value


def unique_strings(values: object) -> tuple[bool, list[str]]:
    if not isinstance(values, list):
        return False, []
    converted = [str(value) for value in values]
    return len(converted) == len(set(converted)), converted


def valid_sha256(value: str) -> bool:
    return bool(re.fullmatch(SHA256_PATTERN, value))
