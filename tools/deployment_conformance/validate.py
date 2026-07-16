#!/usr/bin/env python3
"""CLI for deployment conformance."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .jsonio import load_json
from .validator import validate_deployment


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    report = validate_deployment(
        root,
        load_json(root / "policies/deployment-conformance.json"),
        load_json(root / "data/deployment-conformance.json"),
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
