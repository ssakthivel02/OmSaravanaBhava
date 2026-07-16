"""Semantic override diff."""

from __future__ import annotations

from typing import Any


def index_by_path(payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {str(item["path"]): item for item in payload.get("records", [])}


def semantic_diff(before: dict[str, Any], after: dict[str, Any]) -> dict[str, list[str]]:
    left, right = index_by_path(before), index_by_path(after)
    shared = sorted(set(left) & set(right))
    return {
        "added": sorted(set(right) - set(left)),
        "removed": sorted(set(left) - set(right)),
        "changed": [path for path in shared if left[path] != right[path]],
    }
