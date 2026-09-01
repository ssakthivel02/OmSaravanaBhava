"""Path rule matching."""

from __future__ import annotations

from fnmatch import fnmatchcase
from pathlib import PurePosixPath


def normalise_path(value: str) -> str:
    return PurePosixPath(value.replace("\\", "/")).as_posix().lstrip("./")


def matches_any(path: str, patterns: list[str]) -> str | None:
    normalised = normalise_path(path)
    candidates = [normalised, f"/{normalised}"]
    for pattern in patterns:
        if any(fnmatchcase(candidate, pattern) for candidate in candidates):
            return pattern
    return None
