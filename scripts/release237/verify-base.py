#!/usr/bin/env python3
"""Verify the clean clone is exactly at the approved Release 236 base."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

EXPECTED = "dfc5ce53229d9af53a99fe9a089d5d29bb3ea9b5"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if result.returncode:
        raise SystemExit(result.stderr)
    actual = result.stdout.strip()
    if actual != EXPECTED:
        raise SystemExit(
            f"Expected base {EXPECTED}, found {actual}."
        )
    print(f"Base commit verified: {actual}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
