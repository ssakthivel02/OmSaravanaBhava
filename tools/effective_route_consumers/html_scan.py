"""HTML consumer checks."""

from __future__ import annotations

import re
from pathlib import Path

from .models import Finding

BODY_RELEASE = re.compile(
    r"<body[^>]*\bdata-release=[\"']237[\"']",
    re.IGNORECASE,
)


def scan_html(
    path: Path,
    relative: str,
    expected_script: str,
) -> list[Finding]:
    source = path.read_text(encoding="utf-8")
    findings: list[Finding] = []
    if not BODY_RELEASE.search(source):
        findings.append(Finding(
            relative,
            "release-marker-missing",
            "Consumer page must declare data-release 237.",
        ))
    expected = f'type="module" src="{expected_script}"'
    if expected not in source:
        findings.append(Finding(
            relative,
            "module-script-missing",
            f"Expected module script {expected_script!r}.",
        ))
    return findings
