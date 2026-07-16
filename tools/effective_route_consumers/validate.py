#!/usr/bin/env python3
"""CLI for effective route-consumer validation."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .jsonio import dump_json, load_json
from .validator import validate_effective_route_consumers


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument(
        "--policy",
        default="policies/effective-route-consumers.json",
    )
    parser.add_argument(
        "--runtime",
        default="data/effective-route-registry-runtime.json",
    )
    parser.add_argument("--report")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    report = validate_effective_route_consumers(
        root,
        load_json(root / args.policy),
        load_json(root / args.runtime),
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if args.report:
        dump_json(root / args.report, report)
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
