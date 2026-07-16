"""Path normalisation and matching."""

from __future__ import annotations

from fnmatch import fnmatchcase
from pathlib import PurePosixPath


def normalise_path(value: str) -> str:
    return PurePosixPath(value.replace("\\", "/")).as_posix().lstrip("./")


def first_match(path: str, patterns: list[str]) -> str | None:
    candidate = normalise_path(path)
    for pattern in patterns:
        if fnmatchcase(candidate, pattern) or fnmatchcase(f"/{candidate}", pattern):
            return pattern
    return None
