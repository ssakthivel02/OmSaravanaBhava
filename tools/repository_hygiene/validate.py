#!/usr/bin/env python3
"""Validate tracked repository hygiene."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .git import tracked_files
from .jsonio import dump_json, load_json
from .validator import validate_repository


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--policy", default="policies/repository-hygiene.json")
    parser.add_argument("--allowlist", default="policies/repository-hygiene-allowlist.json")
    parser.add_argument("--report")
    parser.add_argument("--paths-file")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if args.paths_file:
        paths = [
            line.strip()
            for line in Path(args.paths_file).read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
    else:
        paths = tracked_files(root)

    report = validate_repository(
        root,
        paths,
        load_json(root / args.policy),
        load_json(root / args.allowlist),
    )
    payload = report.to_dict()
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if args.report:
        dump_json(root / args.report, payload)
    return 0 if report.status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
