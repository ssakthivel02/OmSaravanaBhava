#!/usr/bin/env python3
"""Verify exact staged paths and Git statuses."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    manifest = json.loads(
        (root / "manifest-release-239.json")
        .read_text(encoding="utf-8")
    )
    expected: dict[str, str] = {}
    for path in manifest["added_files"]:
        expected[path] = "A"
    for path in manifest["modified_files"]:
        expected[path] = "M"
    for path in manifest["deleted_files"]:
        expected[path] = "D"

    output = subprocess.run(
        [
            "git", "diff", "--cached",
            "--name-status", "--no-renames",
        ],
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    ).stdout
    actual = {}
    for line in output.splitlines():
        if not line:
            continue
        status, path = line.split("\t", 1)
        actual[path] = status[0]

    missing = sorted(set(expected) - set(actual))
    extra = sorted(set(actual) - set(expected))
    mismatched = {
        path: {"expected": expected[path], "actual": actual[path]}
        for path in sorted(set(expected) & set(actual))
        if expected[path] != actual[path]
    }
    report = {
        "status": (
            "PASS"
            if not missing and not extra and not mismatched
            else "FAIL"
        ),
        "expectedCount": len(expected),
        "actualCount": len(actual),
        "deletedCount": sum(
            1 for status in actual.values() if status == "D"
        ),
        "missing": missing,
        "extra": extra,
        "mismatched": mismatched,
    }
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
