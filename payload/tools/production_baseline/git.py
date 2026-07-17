from __future__ import annotations
import subprocess
from pathlib import Path

def run(root: Path, *args: str) -> str:
    result = subprocess.run(["git", *args], cwd=root, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip()

def tracked(root: Path) -> set[str]:
    return set(filter(None, run(root, "ls-files").splitlines()))

def staged(root: Path) -> dict[str, str]:
    output = run(root, "diff", "--cached", "--name-status", "--no-renames")
    result: dict[str, str] = {}
    for line in output.splitlines():
        if line:
            status, path = line.split("	", 1)
            result[path] = status[0]
    return result

def head(root: Path) -> str:
    return run(root, "rev-parse", "HEAD")

def parent(root: Path) -> str:
    return run(root, "rev-parse", "HEAD^")

def subject(root: Path) -> str:
    return run(root, "log", "-1", "--format=%s")
