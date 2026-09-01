"""Repository hygiene orchestration."""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Iterable

from .allowlist import active_allowlist
from .constants import FAIL, PASS
from .models import HygieneReport
from .scanner import scan_repository


def validate_repository(
    root: Path,
    paths: Iterable[str],
    policy: dict,
    allowlist_payload: dict,
    *,
    today: date | None = None,
) -> HygieneReport:
    active = active_allowlist(allowlist_payload, today or date.today())
    path_list = sorted(set(paths))
    violations, ignored = scan_repository(root, path_list, policy, active)
    maximum = int(policy.get("maximumViolations", 0))
    status = PASS if len(violations) <= maximum else FAIL
    return HygieneReport(
        status=status,
        scanned_files=len(path_list),
        violations=violations,
        ignored_allowlist=ignored,
    )
