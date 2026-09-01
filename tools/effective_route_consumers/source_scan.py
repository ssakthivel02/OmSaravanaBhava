"""JavaScript source policy checks."""

from __future__ import annotations

import re
from pathlib import Path

from .models import Finding

FETCH_ASSIGNMENT = re.compile(
    r"(?:globalThis|window)\.fetch\s*="
)


def scan_source(path: Path, relative: str) -> list[Finding]:
    source = path.read_text(encoding="utf-8")
    findings: list[Finding] = []
    if FETCH_ASSIGNMENT.search(source):
        findings.append(Finding(
            relative,
            "global-fetch-replacement",
            "Route consumer source must not replace global fetch.",
        ))
    return findings


def require_import(
    path: Path,
    relative: str,
    token: str,
) -> list[Finding]:
    source = path.read_text(encoding="utf-8")
    if token not in source:
        return [Finding(
            relative,
            "explicit-loader-import-missing",
            f"Required token {token!r} is missing.",
        )]
    return []
