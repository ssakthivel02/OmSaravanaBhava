#!/usr/bin/env python3
"""Run Release 237 JavaScript and Python regression suites."""

from __future__ import annotations

import argparse
import os
import subprocess
from pathlib import Path


def execute(command: list[str], root: Path, env: dict[str, str]) -> None:
    print("$", " ".join(command))
    result = subprocess.run(command, cwd=root, env=env, check=False)
    if result.returncode:
        raise SystemExit(result.returncode)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    env = dict(os.environ)
    env["PYTHONDONTWRITEBYTECODE"] = "1"

    node_tests = sorted(
        path.relative_to(root).as_posix()
        for path in (root / "tests/js").glob("*.test.mjs")
    )
    if not node_tests:
        raise SystemExit("No JavaScript tests found.")

    execute(["node", "--test", *node_tests], root, env)
    execute(
        [
            "python",
            "-B",
            "-m",
            "unittest",
            "discover",
            "-s",
            "tests",
            "-p",
            "test_*.py",
            "-v",
        ],
        root,
        env,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
