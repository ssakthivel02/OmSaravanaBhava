"""Canonical override generator."""

from __future__ import annotations

from typing import Any

from .constants import DEFAULT_HISTORICAL_REGISTRY, DEFAULT_SOURCE_PATH
from .normalise import normalise_route
from .validation import validate_boundary_payload, validate_override_payload


def build_effective_overrides(
    boundary_payload: dict[str, Any],
    *,
    release: int,
    generated: str,
) -> dict[str, Any]:
    records = validate_boundary_payload(boundary_payload)
    source_release = int(boundary_payload["release"])
    vocabulary = dict(boundary_payload.get("statusVocabulary") or {})
    output_records = []
    for record in sorted(records, key=lambda item: normalise_route(item["route"])):
        output_records.append({
            "path": normalise_route(record["route"]),
            "status": str(record["verifiedStatus"]),
            "summary": str(record["contentScope"]),
            "publicationStatusPrevious": str(record["declaredRouteStatus"]),
            "publicationStatusCanonical": str(record["verifiedStatus"]),
            "publicationStatusSource": DEFAULT_SOURCE_PATH,
            "publicationBoundaryRelease": source_release,
            "readingEligible": bool(record["readingEligible"]),
            "fullTextPublished": bool(record["fullTextPublished"]),
            "sourceDataPath": str(record["sourceDataPath"]),
            "pageRobots": str(record["pageRobots"]),
            "evidenceMarker": str(record["evidenceMarker"]),
        })
    payload = {
        "release": release,
        "generated": generated,
        "sourceRelease": source_release,
        "sourcePath": DEFAULT_SOURCE_PATH,
        "historicalRegistryPath": DEFAULT_HISTORICAL_REGISTRY,
        "effectiveRegistryStrategy": "deterministic-canonical-overrides",
        "recordCount": len(output_records),
        "statusVocabulary": vocabulary,
        "records": output_records,
        "limitations": [
            "This file contains canonical overrides only; the historical route registry remains unchanged.",
            "Only evidence-backed publication boundary records are represented.",
            "A canonical status describes current page scope and does not assert completeness of the underlying literary work.",
            "No modern translation, commentary, copyrighted recording or missing verse is introduced.",
        ],
    }
    validate_override_payload(payload)
    return payload
