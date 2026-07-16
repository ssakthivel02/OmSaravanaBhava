"""Route-registry deployment checks."""

from __future__ import annotations

from pathlib import Path

from .models import Finding


def validate_route_assets(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    required = [
        "data/site-routes-effective-overrides.json",
        "data/effective-route-registry-runtime.json",
    ]
    for relative in required:
        if not (root / relative).is_file():
            findings.append(Finding(relative, "route-asset", "Required route-registry asset is missing."))
    if (root / "assets/js/site-directory.js").exists():
        findings.append(Finding(
            "assets/js/site-directory.js",
            "legacy-route-consumer",
            "Retired non-module Site Directory consumer remains tracked.",
        ))
    return findings
