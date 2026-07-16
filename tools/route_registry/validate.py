#!/usr/bin/env python3
"""Validate canonical route overrides and optional generator drift."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .generator import build_effective_overrides
from .jsonio import load_json
from .validation import validate_override_payload


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--boundaries", default="data/publication-boundaries.json")
    parser.add_argument("--overrides", default="data/site-routes-effective-overrides.json")
    parser.add_argument("--release", type=int, default=234)
    parser.add_argument("--generated", default="2026-07-16")
    parser.add_argument("--check-drift", action="store_true")
    args = parser.parse_args()
    actual = load_json(Path(args.overrides))
    validate_override_payload(actual)
    if args.check_drift:
        expected = build_effective_overrides(
            load_json(Path(args.boundaries)), release=args.release, generated=args.generated
        )
        if actual != expected:
            print(json.dumps({"status": "FAIL", "reason": "generated output drift"}, indent=2))
            return 1
    print(json.dumps({"status": "PASS", "records": actual["recordCount"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
