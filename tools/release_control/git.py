"""Small, explicit Git command adapter."""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CommandResult:
    code: int
    output: str


def run_git(root: Path, *args: str) -> CommandResult:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    return CommandResult(result.returncode, result.stdout.strip())


def is_repository(root: Path) -> bool:
    return run_git(root, "rev-parse", "--is-inside-work-tree").output == "true"


def current_sha(root: Path) -> str:
    result = run_git(root, "rev-parse", "HEAD")
    return result.output if result.code == 0 else ""


def parent_sha(root: Path) -> str:
    result = run_git(root, "rev-parse", "HEAD^")
    return result.output if result.code == 0 else ""


def commit_subject(root: Path) -> str:
    result = run_git(root, "log", "-1", "--pretty=%s")
    return result.output if result.code == 0 else ""


def commit_body(root: Path) -> str:
    result = run_git(root, "log", "-1", "--pretty=%b")
    return result.output if result.code == 0 else ""


def first_non_empty_line(value: str) -> str:
    return next((line.strip() for line in value.splitlines() if line.strip()), "")


def changed_files(root: Path) -> list[str]:
    result = run_git(
        root,
        "diff",
        "--name-only",
        "--diff-filter=ACDMRTUXB",
        "HEAD^",
        "HEAD",
    )
    if result.code != 0:
        return []
    return sorted(line for line in result.output.splitlines() if line.strip())


def changed_status(root: Path) -> list[tuple[str, str]]:
    result = run_git(root, "diff", "--name-status", "HEAD^", "HEAD")
    if result.code != 0:
        return []
    output: list[tuple[str, str]] = []
    for line in result.output.splitlines():
        parts = line.split("	")
        if len(parts) >= 2:
            output.append((parts[0], parts[-1]))
    return output


def reverse_patch_check(root: Path, patch: Path) -> CommandResult:
    return run_git(root, "apply", "--reverse", "--check", str(patch))
