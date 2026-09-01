"""Expiring integrity allowlist."""

from __future__ import annotations

from datetime import date
from typing import Any


def active_allowlist(payload: dict[str, Any], today: date) -> set[str]:
    paths: set[str] = set()
    for entry in payload.get("entries", []):
        if not isinstance(entry, dict):
            continue
        path = str(entry.get("path", "")).strip()
        reason = str(entry.get("reason", "")).strip()
        expires = str(entry.get("expires", "")).strip()
        if not path or not reason or not expires:
            continue
        try:
            expiry = date.fromisoformat(expires)
        except ValueError:
            continue
        if expiry >= today:
            paths.add(path)
    return paths
