#!/usr/bin/env python3
"""Verify the browser-upload bootstrap commit."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

BASE = "b7bc25a3888f5bbe4a55a55ba69fd05ac3cc8e60"
SUBJECT = "Bootstrap Release 238: install browser-safe finalizer and deployment conformance"


def git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if result.returncode:
        raise SystemExit(result.stderr or result.stdout)
    return result.stdout.strip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    root = Path(args.root).resolve()

    head = git(root, "rev-parse", "HEAD")
    parent = git(root, "rev-parse", "HEAD^")
    subject = git(root, "log", "-1", "--format=%s")
    if parent != BASE:
        raise SystemExit(f"Bootstrap parent mismatch: {parent}")
    if subject != SUBJECT:
        raise SystemExit(f"Bootstrap subject mismatch: {subject}")
    print(f"Bootstrap verified: {head}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
