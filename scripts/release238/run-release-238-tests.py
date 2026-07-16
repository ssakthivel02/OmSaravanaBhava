#!/usr/bin/env python3
"""Run Release 238 regression and conformance suites."""

from __future__ import annotations

import argparse
import os
import subprocess
from pathlib import Path


def run(command: list[str], root: Path, env: dict[str, str]) -> None:
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

    js_tests = sorted(
        path.relative_to(root).as_posix()
        for path in (root / "tests/js").glob("*.test.mjs")
    )
    run(["node", "--test", *js_tests], root, env)
    run([
        "python", "-B", "-m", "unittest", "discover",
        "-s", "tests", "-p", "test_*.py", "-v",
    ], root, env)
    run([
        "python", "-B", "-m",
        "tools.deployment_conformance.validate",
        "--root", ".",
    ], root, env)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
