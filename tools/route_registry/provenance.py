"""Provenance extraction."""

from __future__ import annotations

from typing import Any


def provenance_record(override: dict[str, Any]) -> dict[str, Any]:
    return {
        "path": override["path"],
        "source": override["publicationStatusSource"],
        "sourceRelease": override["publicationBoundaryRelease"],
        "sourceDataPath": override["sourceDataPath"],
        "evidenceMarker": override["evidenceMarker"],
    }
