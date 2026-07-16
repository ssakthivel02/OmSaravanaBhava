#!/usr/bin/env python3
"""Validate repository integrity and emit JSON/SARIF evidence."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from .git import tracked_files
from .jsonio import dump_json, load_json
from .sarif import to_sarif
from .validator import validate_repository_integrity


MANIFEST_PATTERN = re.compile(r"manifest-release-(\d+)\.json$")


def discover_latest_manifest(root: Path) -> str:
    candidates = []
    for path in root.glob("manifest-release-*.json"):
        match = MANIFEST_PATTERN.fullmatch(path.name)
        if match:
            candidates.append((int(match.group(1)), path.name))
    if not candidates:
        raise FileNotFoundError("No numeric release manifest found.")
    return max(candidates)[1]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument(
        "--policy",
        default="policies/repository-integrity.json",
    )
    parser.add_argument(
        "--allowlist",
        default="policies/repository-integrity-allowlist.json",
    )
    parser.add_argument("--manifest")
    parser.add_argument("--report")
    parser.add_argument("--inventory")
    parser.add_argument("--sarif")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    manifest_path = args.manifest or discover_latest_manifest(root)
    paths = tracked_files(root)
    report, inventory = validate_repository_integrity(
        root,
        paths,
        load_json(root / args.policy),
        load_json(root / args.allowlist),
        load_json(root / manifest_path),
        manifest_path,
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
