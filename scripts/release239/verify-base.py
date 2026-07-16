#!/usr/bin/env python3
"""Verify the approved Release 238 base commit."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

EXPECTED = "530ad97c68b6e7b8cbe997f2b6bbaf440ec5d527"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    actual = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    ).stdout.strip()
    if actual != EXPECTED:
        raise SystemExit(
            f"Expected base {EXPECTED}, found {actual}."
        )
    print(f"Base verified: {actual}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
