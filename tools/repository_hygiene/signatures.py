"""Generated and binary file signatures."""

from __future__ import annotations

from pathlib import Path


def signature_reason(path: Path) -> str | None:
    suffix = path.suffix.lower()
    if suffix in {".pyc", ".pyo"}:
        return "compiled-python-bytecode"
    if not path.is_file():
        return None
    prefix = path.read_bytes()[:8]
    if suffix == ".pyc" and len(prefix) >= 4:
        return "compiled-python-bytecode"
    return None
