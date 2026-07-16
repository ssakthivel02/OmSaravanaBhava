#!/usr/bin/env python3
"""Generate deterministic canonical route overrides."""

from __future__ import annotations

import argparse
from pathlib import Path

from .generator import build_effective_overrides
from .jsonio import dump_json, load_json


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/publication-boundaries.json")
    parser.add_argument("--output", default="data/site-routes-effective-overrides.json")
    parser.add_argument("--release", type=int, default=234)
    parser.add_argument("--generated", default="2026-07-16")
    args = parser.parse_args()
    payload = build_effective_overrides(
        load_json(Path(args.input)), release=args.release, generated=args.generated
    )
    dump_json(Path(args.output), payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
