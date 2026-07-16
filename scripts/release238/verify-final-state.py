#!/usr/bin/env python3
"""Verify the prepared Release 238 final commit state."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path


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
    plan = json.loads(
        (root / "data/release-238-deletion-plan.json")
        .read_text(encoding="utf-8")
    )
    tracked = set(filter(None, git(root, "ls-files").splitlines()))
    remaining = sorted(set(plan["paths"]) & tracked)
    if remaining:
        raise SystemExit(
            "Planned deletion targets remain tracked:\n" +
            "\n".join(remaining)
        )
    staged = git(
        root,
        "diff",
        "--cached",
        "--name-status",
        "--no-renames",
    ).splitlines()
    deleted = [line for line in staged if line.startswith("D\t")]
    if len(deleted) != 14:
        raise SystemExit(
            f"Expected 14 staged deletions, found {len(deleted)}."
        )
    print("Final state verified: 14 deletions and zero forbidden tracked paths.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
