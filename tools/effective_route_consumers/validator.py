"""Effective route-consumer validation."""

from __future__ import annotations

from pathlib import Path

from .constants import FAIL, PASS
from .hashing import sha256
from .html_scan import scan_html
from .jsonio import load_json
from .models import Finding
from .runtime import validate_runtime
from .source_scan import require_import, scan_source


def validate_effective_route_consumers(
    root: Path,
    policy: dict,
    runtime: dict,
) -> dict:
    findings: list[Finding] = []

    required = [
        str(path)
        for path in policy.get("consumers", {}).values()
    ] + [
        str(policy.get("loader", "")),
        str(policy.get("compatibilityHelper", "")),
        "content-status.html",
        "discovery.html",
        "site-directory.html",
    ]
    for relative in sorted(set(filter(None, required))):
        if not (root / relative).is_file():
            findings.append(Finding(
                relative,
                "required-asset-missing",
                "Required route-consumer asset is missing.",
            ))

    source_paths = [
        "assets/js/effective-route-registry.mjs",
        "assets/js/content-status-audit.mjs",
        "assets/js/discovery-workspace.mjs",
        "assets/js/site-directory.mjs",
        "assets/js/route-status-reconciliation.js",
    ]
    for relative in source_paths:
        path = root / relative
        if path.is_file():
            findings.extend(scan_source(path, relative))

    for relative in [
        "assets/js/content-status-audit.mjs",
        "assets/js/discovery-workspace.mjs",
        "assets/js/site-directory.mjs",
    ]:
        path = root / relative
        if path.is_file():
            findings.extend(require_import(
                path,
                relative,
                "loadEffectiveRouteRegistry",
            ))

    html_scripts = {
        "content-status.html": "assets/js/content-status-audit.mjs",
        "discovery.html": "assets/js/discovery-workspace.mjs",
        "site-directory.html": "assets/js/site-directory.mjs",
    }
    for relative, script in html_scripts.items():
        path = root / relative
        if path.is_file():
            findings.extend(scan_html(path, relative, script))

    findings.extend(validate_runtime(
        runtime,
        "data/effective-route-registry-runtime.json",
    ))

    expected_hash = str(
        policy.get("effectiveOverridesSha256", "")
    ).strip()
    override_path = root / str(
        policy.get(
            "effectiveOverrides",
            "data/site-routes-effective-overrides.json",
        )
    )
    if expected_hash and override_path.is_file():
        actual_hash = sha256(override_path)
        if actual_hash != expected_hash:
            findings.append(Finding(
                override_path.relative_to(root).as_posix(),
                "override-registry-drift",
                "Effective override registry changed unexpectedly.",
            ))

    legacy = root / "assets/js/site-directory.js"
    if legacy.exists():
        findings.append(Finding(
            "assets/js/site-directory.js",
            "legacy-consumer-remains",
            "Legacy non-module Site Directory consumer must be removed.",
        ))

    return {
        "status": PASS if not findings else FAIL,
        "release": int(policy.get("release", 238)),
        "findingCount": len(findings),
        "findings": [item.to_dict() for item in findings],
    }
