"""Tracked-file repository scanner."""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

from .matching import matches_any, normalise_path
from .models import Violation
from .signatures import signature_reason


def scan_repository(
    root: Path,
    paths: Iterable[str],
    policy: dict,
    allowlisted: set[str],
) -> tuple[list[Violation], list[str]]:
    violations: list[Violation] = []
    ignored: list[str] = []
    patterns = [str(item) for item in policy.get("forbiddenTrackedGlobs", [])]
    extensions = {
        str(item).lower() for item in policy.get("forbiddenExtensions", [])
    }
    exact = {
        normalise_path(str(item))
        for item in policy.get("forbiddenExactPaths", [])
    }

    for raw in sorted(set(paths)):
        path = normalise_path(raw)
        if path in allowlisted:
            ignored.append(path)
            continue
        file_path = root / path
        size = file_path.stat().st_size if file_path.is_file() else 0

        if path in exact:
            violations.append(Violation(path, "forbidden-exact-path", "Exact path is forbidden.", size))
            continue

        pattern = matches_any(path, patterns)
        if pattern:
            violations.append(Violation(path, "forbidden-glob", f"Matched {pattern!r}.", size))
            continue

        suffix = file_path.suffix.lower()
        if suffix in extensions:
            violations.append(Violation(path, "forbidden-extension", f"Extension {suffix!r} is forbidden.", size))
            continue

        reason = signature_reason(file_path)
        if reason:
            violations.append(Violation(path, "forbidden-signature", reason, size))

    return violations, ignored
