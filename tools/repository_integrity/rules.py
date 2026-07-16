"""Integrity rule evaluation."""

from __future__ import annotations

from pathlib import Path

from .models import IntegrityViolation
from .paths import first_match


def evaluate_path(root: Path, path: str, policy: dict) -> list[IntegrityViolation]:
    violations: list[IntegrityViolation] = []
    file_path = root / path
    pattern = first_match(path, [str(x) for x in policy.get("forbiddenTrackedPatterns", [])])
    if pattern:
        violations.append(IntegrityViolation(
            path=path,
            rule="forbidden-tracked-pattern",
            message=f"Tracked path matches {pattern!r}.",
        ))
        return violations

    suffix = file_path.suffix.lower()
    forbidden_extensions = {
        str(item).lower()
        for item in policy.get("forbiddenGeneratedExtensions", [])
    }
    if suffix in forbidden_extensions:
        violations.append(IntegrityViolation(
            path=path,
            rule="forbidden-generated-extension",
            message=f"Tracked extension {suffix!r} is forbidden.",
        ))

    if file_path.is_file():
        maximum = int(policy.get("maximumTrackedFileBytes", 25_000_000))
        if file_path.stat().st_size > maximum:
            violations.append(IntegrityViolation(
                path=path,
                rule="tracked-file-too-large",
                message=f"Tracked file exceeds {maximum} bytes.",
            ))
    return violations
