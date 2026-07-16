"""Atomic publisher validation."""

from __future__ import annotations

from pathlib import Path

from .constants import FAIL, PASS
from .models import Finding
from .plan import expected_changes, validate_manifest_plan


def validate_atomic_publish_plan(
    *,
    root: Path,
    policy: dict,
    contract: dict,
    manifest: dict,
    staged_changes: dict[str, str] | None = None,
    tracked_before: set[str] | None = None,
    tracked_after: set[str] | None = None,
) -> dict:
    findings: list[Finding] = []
    findings.extend(validate_manifest_plan(manifest, policy))

    if contract.get("release") != 239:
        findings.append(Finding("contract-release", "Atomic publisher contract release must be 239."))
    if contract.get("baseCommit") != policy.get("requiredBaseCommit"):
        findings.append(Finding("contract-base", "Atomic publisher contract base differs from policy."))
    if contract.get("browserUploadAllowed") is not False:
        findings.append(Finding("browser-upload", "Browser upload must be forbidden for Release 239."))

    expected = expected_changes(manifest)
    if staged_changes is not None:
        missing = sorted(set(expected) - set(staged_changes))
        extra = sorted(set(staged_changes) - set(expected))
        mismatched = sorted(
            path for path in set(expected) & set(staged_changes)
            if expected[path] != staged_changes[path]
        )
        if missing:
            findings.append(Finding("staged-missing", "Missing staged paths: " + ", ".join(missing)))
        if extra:
            findings.append(Finding("staged-extra", "Undeclared staged paths: " + ", ".join(extra)))
        if mismatched:
            findings.append(Finding("staged-status", "Incorrect staged status: " + ", ".join(mismatched)))

    deletion_targets = set(manifest.get("deleted_files", []))
    if tracked_before is not None:
        missing_before = sorted(deletion_targets - tracked_before)
        if missing_before:
            findings.append(Finding(
                "deletion-target-missing-before",
                "Deletion targets were not tracked before apply: " + ", ".join(missing_before),
            ))
    if tracked_after is not None:
        remaining = sorted(deletion_targets & tracked_after)
        if remaining:
            findings.append(Finding(
                "deletion-target-remains",
                "Deletion targets remain tracked after apply: " + ", ".join(remaining),
            ))

    return {
        "status": PASS if not findings else FAIL,
        "release": 239,
        "findingCount": len(findings),
        "declaredChangedCount": len(expected),
        "declaredDeletedCount": len(deletion_targets),
        "findings": [finding.to_dict() for finding in findings],
    }
