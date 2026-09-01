"""Boundary and override validation."""

from __future__ import annotations

from collections import Counter
from typing import Any

from .constants import ALLOWED_STATUSES, REQUIRED_BOUNDARY_FIELDS, REQUIRED_OVERRIDE_FIELDS
from .errors import RouteRegistryError
from .normalise import normalise_route, normalise_text


def _records(payload: dict[str, Any]) -> list[dict[str, Any]]:
    records = payload.get("records")
    if not isinstance(records, list):
        raise RouteRegistryError("records must be an array.")
    if not records:
        raise RouteRegistryError("records must not be empty.")
    if not all(isinstance(item, dict) for item in records):
        raise RouteRegistryError("Every record must be an object.")
    return records


def validate_boundary_payload(payload: dict[str, Any]) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        raise RouteRegistryError("Boundary payload must be an object.")
    release = payload.get("release")
    if not isinstance(release, int) or release < 1:
        raise RouteRegistryError("release must be a positive integer.")
    records = _records(payload)
    routes: list[str] = []
    for index, record in enumerate(records):
        missing = sorted(REQUIRED_BOUNDARY_FIELDS - set(record))
        if missing:
            raise RouteRegistryError(f"Record {index} missing fields: {', '.join(missing)}")
        route = normalise_route(record["route"])
        routes.append(route)
        status = normalise_text(record["verifiedStatus"], "verifiedStatus")
        if status not in ALLOWED_STATUSES:
            raise RouteRegistryError(f"Unsupported verifiedStatus {status!r} for {route}")
        normalise_text(record["declaredRouteStatus"], "declaredRouteStatus")
        normalise_text(record["sourceDataPath"], "sourceDataPath")
        normalise_text(record["pageRobots"], "pageRobots")
        normalise_text(record["contentScope"], "contentScope")
        normalise_text(record["evidenceMarker"], "evidenceMarker")
        if not isinstance(record["fullTextPublished"], bool):
            raise RouteRegistryError(f"fullTextPublished must be boolean for {route}")
        if not isinstance(record["readingEligible"], bool):
            raise RouteRegistryError(f"readingEligible must be boolean for {route}")
        if record["fullTextPublished"]:
            raise RouteRegistryError(f"Canonical boundary must not claim full text for {route}")
    duplicates = sorted(route for route, count in Counter(routes).items() if count > 1)
    if duplicates:
        raise RouteRegistryError(f"Duplicate routes: {', '.join(duplicates)}")
    return records


def validate_override_payload(payload: dict[str, Any]) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        raise RouteRegistryError("Override payload must be an object.")
    records = _records(payload)
    expected_count = payload.get("recordCount")
    if expected_count != len(records):
        raise RouteRegistryError("recordCount does not match records length.")
    paths = []
    for index, record in enumerate(records):
        missing = sorted(REQUIRED_OVERRIDE_FIELDS - set(record))
        if missing:
            raise RouteRegistryError(f"Override {index} missing fields: {', '.join(missing)}")
        path = normalise_route(record["path"])
        paths.append(path)
        if record["status"] != record["publicationStatusCanonical"]:
            raise RouteRegistryError(f"Canonical status mismatch for {path}")
        if record["summary"] == "":
            raise RouteRegistryError(f"Summary must not be empty for {path}")
        if record["fullTextPublished"] is not False:
            raise RouteRegistryError(f"fullTextPublished must remain false for {path}")
    if paths != sorted(paths):
        raise RouteRegistryError("Override records must be sorted by path.")
    if len(paths) != len(set(paths)):
        raise RouteRegistryError("Override paths must be unique.")
    return records
