"""SHA256 ledger validation."""

from __future__ import annotations

from pathlib import Path

from .constants import FAIL, PASS
from .jsonio import sha256_file, valid_sha256
from .models import CheckResult


def check_checksums(root: Path, config: dict) -> CheckResult:
    relative = str(config.get("checksumLedger", ""))
    ledger = root / relative
    if not ledger.is_file():
        return CheckResult("checksum-ledger", FAIL, f"Checksum ledger is missing: {relative}")

    errors: list[str] = []
    checked = 0
    seen: set[str] = set()
    for number, line in enumerate(ledger.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        if "  " not in line:
            errors.append(f"line {number}: invalid format")
            continue
        expected, path_text = line.split("  ", 1)
        if not valid_sha256(expected):
            errors.append(f"line {number}: invalid SHA256")
            continue
        if path_text in seen:
            errors.append(f"line {number}: duplicate path {path_text}")
            continue
        seen.add(path_text)
        target = root / path_text
        if not target.is_file():
            errors.append(f"line {number}: missing {path_text}")
            continue
        actual = sha256_file(target)
        if actual != expected:
            errors.append(f"line {number}: checksum mismatch {path_text}")
            continue
        checked += 1
    return CheckResult(
        "checksum-ledger",
        FAIL if errors else PASS,
        f"Validated {checked} SHA256 entries."
        if not errors
        else f"Checksum ledger errors: {errors}",
        {"checked": checked, "errors": errors},
    )
