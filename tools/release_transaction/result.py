"""Finalization-result generation."""

from __future__ import annotations

from datetime import datetime, timezone


def build_result(
    *,
    bootstrap_commit: str,
    final_title: str,
    deleted_paths: list[str],
    validation: dict,
) -> dict:
    return {
        "release": 238,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "bootstrapCommit": bootstrap_commit,
        "finalCommitTitle": final_title,
        "deletedPaths": sorted(deleted_paths),
        "deletedCount": len(deleted_paths),
        "validation": validation,
    }
