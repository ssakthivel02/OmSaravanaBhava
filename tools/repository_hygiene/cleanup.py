#!/usr/bin/env python3
"""Remove known generated cache paths from a local working tree."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--targets", default="policies/repository-cleanup-targets.json")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    payload = json.loads((root / args.targets).read_text(encoding="utf-8"))
    removed = []
    missing = []
    for raw in payload.get("trackedPathsToRemove", []):
        path = root / str(raw)
        if not path.exists():
            missing.append(str(raw))
            continue
        removed.append(str(raw))
        if args.dry_run:
            continue
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()
    print(json.dumps({"removed": removed, "missing": missing, "dry_run": args.dry_run}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
