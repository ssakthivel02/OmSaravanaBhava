"""Repository integrity orchestration."""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Iterable

from .allowlist import active_allowlist
from .assets import check_required_assets
from .constants import FAIL, PASS
from .hashing import payload_sha256
from .inventory import build_inventory
from .manifest import check_manifest
from .models import IntegrityReport
from .rules import evaluate_path


def validate_repository_integrity(
    root: Path,
    paths: Iterable[str],
    policy: dict,
    allowlist_payload: dict,
    manifest_payload: dict,
    manifest_path: str,
    *,
    today: date | None = None,
) -> tuple[IntegrityReport, dict]:
    path_list = sorted(set(paths))
    allowlisted = active_allowlist(allowlist_payload, today or date.today())
    violations = []
    ignored = []

    for path in path_list:
        if path in allowlisted:
            ignored.append(path)
            continue
        violations.extend(evaluate_path(root, path, policy))

    violations.extend(check_required_assets(root, policy))
    violations.extend(check_manifest(manifest_payload, policy, manifest_path))

    inventory = build_inventory(root, path_list, int(policy.get("release", 0)))
    maximum = int(policy.get("maximumViolations", 0))
    report = IntegrityReport(
        status=PASS if len(violations) <= maximum else FAIL,
        tracked_files=len(path_list),
        violations=violations,
        inventory_sha256=inventory["inventorySha256"],
        ignored_allowlist=ignored,
    )
    return report, inventory
