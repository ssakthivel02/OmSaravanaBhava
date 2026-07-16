#!/usr/bin/env python3
"""Fail if any tracked Python cache remains."""

from __future__ import annotations

import subprocess


def main() -> int:
    result = subprocess.run(
        ["git", "ls-files"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if result.returncode:
        raise SystemExit(result.stderr)
    matches = [
        path for path in result.stdout.splitlines()
        if "/__pycache__/" in f"/{path}"
        or path.endswith((".pyc", ".pyo"))
    ]
    if matches:
        raise SystemExit(
            "Tracked Python caches remain:\n" + "\n".join(matches)
        )
    print("No tracked Python cache files remain.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
