#!/usr/bin/env python3
"""Validate canonical route overrides and optional generator drift."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .generator import build_effective_overrides
from .jsonio import load_json
from .validation import validate_override_payload


def _policy_values(config_path: Path) -> tuple[str, str, int, str]:
    config = load_json(config_path)
    policy = config["routeRegistryPolicy"]
    return (
        str(policy["boundaryRegistry"]),
        str(policy["effectiveOverrides"]),
        int(policy["validationRelease"]),
        str(policy["validationGenerated"]),
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--boundaries")
    parser.add_argument("--overrides")
    parser.add_argument("--release", type=int)
    parser.add_argument("--generated")
    parser.add_argument("--config")
    parser.add_argument("--check-drift", action="store_true")
    args = parser.parse_args()

    if args.config:
        boundaries, overrides, release, generated = _policy_values(Path(args.config))
    else:
        boundaries = args.boundaries or "data/publication-boundaries.json"
        overrides = args.overrides or "data/site-routes-effective-overrides.json"
        release = args.release or 234
        generated = args.generated or "2026-07-16"

    actual = load_json(Path(overrides))
    validate_override_payload(actual)
    if args.check_drift:
        expected = build_effective_overrides(
            load_json(Path(boundaries)),
            release=release,
            generated=generated,
        )
        if actual != expected:
            print(json.dumps({"status": "FAIL", "reason": "generated output drift"}, indent=2))
            return 1
    print(json.dumps({"status": "PASS", "records": actual["recordCount"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
