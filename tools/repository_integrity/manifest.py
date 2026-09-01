"""Release-manifest integrity checks."""

from __future__ import annotations

from .models import IntegrityViolation


def check_manifest(payload: dict, policy: dict, manifest_path: str) -> list[IntegrityViolation]:
    violations = []
    for field in policy.get("requiredManifestFields", []):
        if field not in payload:
            violations.append(IntegrityViolation(
                path=manifest_path,
                rule="manifest-field-missing",
                message=f"Required manifest field {field!r} is missing.",
            ))
    declared = (
        list(payload.get("added_files", []))
        + list(payload.get("modified_files", []))
        + list(payload.get("deleted_files", []))
    )
    if len(declared) != len(set(declared)):
        violations.append(IntegrityViolation(
            path=manifest_path,
            rule="manifest-duplicate-path",
            message="Manifest contains duplicate changed paths.",
        ))
    return violations
