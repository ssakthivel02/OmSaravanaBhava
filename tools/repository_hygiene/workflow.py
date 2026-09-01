"""Workflow command construction."""

from __future__ import annotations

from pathlib import Path

from .jsonio import load_json


def route_registry_command(root: Path, config_path: str = ".release-governance.json") -> list[str]:
    config = load_json(root / config_path)
    policy = config["routeRegistryPolicy"]
    return [
        "python",
        "-m",
        "tools.route_registry.validate",
        "--boundaries",
        str(policy["boundaryRegistry"]),
        "--overrides",
        str(policy["effectiveOverrides"]),
        "--release",
        str(policy["validationRelease"]),
        "--generated",
        str(policy["validationGenerated"]),
        "--check-drift",
    ]
