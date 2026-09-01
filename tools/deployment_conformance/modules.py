"""JavaScript module deployment checks."""

from __future__ import annotations

import re
from pathlib import Path

from .models import Finding

FETCH_ASSIGNMENT = re.compile(r"(?:globalThis|window)\.fetch\s*=")


def validate_modules(root: Path, paths: list[str]) -> list[Finding]:
    findings: list[Finding] = []
    for relative in paths:
        path = root / relative
        if not path.is_file():
            findings.append(Finding(relative, "module-missing", "Required module is missing."))
            continue
        source = path.read_text(encoding="utf-8")
        if FETCH_ASSIGNMENT.search(source):
            findings.append(Finding(relative, "global-fetch", "Module replaces the global Fetch API."))
    return findings
