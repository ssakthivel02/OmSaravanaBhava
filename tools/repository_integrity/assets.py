"""Required governance asset checks."""

from __future__ import annotations

from pathlib import Path

from .models import IntegrityViolation


def check_required_assets(root: Path, policy: dict) -> list[IntegrityViolation]:
    violations = []
    for raw in policy.get("requiredGovernanceAssets", []):
        path = str(raw)
        if not (root / path).is_file():
            violations.append(IntegrityViolation(
                path=path,
                rule="missing-governance-asset",
                message="Required governance asset is missing.",
            ))
    return violations
