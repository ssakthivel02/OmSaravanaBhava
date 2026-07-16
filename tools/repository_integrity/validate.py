#!/usr/bin/env python3
"""Validate repository integrity and emit JSON/SARIF evidence."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .git import tracked_files
from .jsonio import dump_json, load_json
from .sarif import to_sarif
from .validator import validate_repository_integrity


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--policy", default="policies/repository-integrity.json")
    parser.add_argument("--allowlist", default="policies/repository-integrity-allowlist.json")
    parser.add_argument("--manifest", default="manifest-release-236.json")
    parser.add_argument("--report")
    parser.add_argument("--inventory")
    parser.add_argument("--sarif")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    paths = tracked_files(root)
    report, inventory = validate_repository_integrity(
        root,
        paths,
        load_json(root / args.policy),
        load_json(root / args.allowlist),
        load_json(root / args.manifest),
        args.manifest,
    )
    payload = report.to_dict()
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if args.report:
        dump_json(root / args.report, payload)
    if args.inventory:
        dump_json(root / args.inventory, inventory)
    if args.sarif:
        dump_json(root / args.sarif, to_sarif(report))
    return 0 if report.status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
