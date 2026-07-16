"""Inventory semantic diff."""

from __future__ import annotations


def index_records(payload: dict) -> dict[str, dict]:
    return {
        str(item["path"]): item
        for item in payload.get("records", [])
    }


def inventory_diff(before: dict, after: dict) -> dict[str, list[str]]:
    left = index_records(before)
    right = index_records(after)
    shared = sorted(set(left) & set(right))
    return {
        "added": sorted(set(right) - set(left)),
        "removed": sorted(set(left) - set(right)),
        "changed": [path for path in shared if left[path] != right[path]],
    }
