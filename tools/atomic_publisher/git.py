"""Git state helpers."""

from __future__ import annotations

import subprocess
from pathlib import Path


def run(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip()


def head(root: Path) -> str:
    return run(root, "rev-parse", "HEAD")


def subject(root: Path) -> str:
    return run(root, "log", "-1", "--format=%s")


def parent(root: Path) -> str:
    return run(root, "rev-parse", "HEAD^")


def tracked(root: Path) -> set[str]:
    return set(filter(None, run(root, "ls-files").splitlines()))


def staged(root: Path) -> dict[str, str]:
    output = run(root, "diff", "--cached", "--name-status", "--no-renames")
    changes: dict[str, str] = {}
    for line in output.splitlines():
        if not line:
            continue
        status, path = line.split("\t", 1)
        changes[path] = status[0]
    return changes
