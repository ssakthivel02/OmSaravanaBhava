#!/usr/bin/env python3
"""Remove declared tracked generated files from a local clone."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument(
        "--policy",
        default="policies/repository-integrity-cleanup.json",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    payload = json.loads((root / args.policy).read_text(encoding="utf-8"))
    targets = [str(item) for item in payload.get("trackedPathsToDelete", [])]
    if args.dry_run:
        print(json.dumps({"dryRun": True, "targets": targets}, indent=2))
        return 0
    result = subprocess.run(
        ["git", "rm", "-f", "--ignore-unmatch", "--", *targets],
        cwd=root,
        check=False,
    )
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
