#!/usr/bin/env python3
"""Verify exact staged path and status coverage against Release 237 manifest."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path


def staged_changes(root: Path) -> dict[str, str]:
    result = subprocess.run(
        [
            "git",
            "diff",
            "--cached",
            "--name-status",
            "--no-renames",
        ],
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if result.returncode:
        raise SystemExit(result.stderr)
    changes: dict[str, str] = {}
    for line in result.stdout.splitlines():
        if not line.strip():
            continue
        status, path = line.split("\t", 1)
        changes[path] = status[0]
    return changes


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repository-root", required=True)
    parser.add_argument(
        "--manifest",
        default="manifest-release-237.json",
    )
    args = parser.parse_args()

    root = Path(args.repository_root).resolve()
    manifest = json.loads(
        (root / args.manifest).read_text(encoding="utf-8")
    )
    expected: dict[str, str] = {}
    for path in manifest.get("added_files", []):
        expected[str(path)] = "A"
    for path in manifest.get("modified_files", []):
        expected[str(path)] = "M"
    for path in manifest.get("deleted_files", []):
        expected[str(path)] = "D"

    actual = staged_changes(root)
    missing = sorted(set(expected) - set(actual))
    extra = sorted(set(actual) - set(expected))
    mismatched = {
        path: {
            "expected": expected[path],
            "actual": actual[path],
        }
        for path in sorted(set(expected) & set(actual))
        if expected[path] != actual[path]
    }
    payload = {
        "status": (
            "PASS"
            if not missing and not extra and not mismatched
            else "FAIL"
        ),
        "expectedCount": len(expected),
        "actualCount": len(actual),
        "missing": missing,
        "extra": extra,
        "mismatched": mismatched,
        "deletions": sum(
            1 for value in actual.values() if value == "D"
        ),
    }
    print(json.dumps(payload, indent=2))
    return 0 if payload["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
