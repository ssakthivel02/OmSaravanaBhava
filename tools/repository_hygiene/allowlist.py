"""Time-bounded hygiene allowlist."""

from __future__ import annotations

from datetime import date
from typing import Any


def active_allowlist(payload: dict[str, Any], today: date) -> set[str]:
    result: set[str] = set()
    for item in payload.get("entries", []):
        if not isinstance(item, dict):
            continue
        path = str(item.get("path", "")).strip()
        reason = str(item.get("reason", "")).strip()
        expires = str(item.get("expires", "")).strip()
        if not path or not reason or not expires:
            continue
        try:
            expiry = date.fromisoformat(expires)
        except ValueError:
            continue
        if expiry >= today:
            result.add(path)
    return result
