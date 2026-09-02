#!/usr/bin/env python3
"""Validate the governed reconciliation ledger for the 52 unresolved R6 assets."""

from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
LEDGER = REPO_ROOT / "docs" / "R6_ASSET_RECONCILIATION.csv"
EXPECTED_COUNT = 52
ALLOWED_STATUSES = {
    "PENDING",
    "FOUND_VERIFIED",
    "RIGHTS_SAFE_REPLACEMENT",
    "QUARANTINED",
    "INTENTIONALLY_REMOVED",
}
RESOLVED_STATUSES = ALLOWED_STATUSES - {"PENDING"}
REQUIRED_COLUMNS = {
    "asset_id",
    "original_reference",
    "source_context",
    "status",
    "replacement_reference",
    "provenance_or_rights",
    "evidence",
    "notes",
}


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_rows() -> list[dict[str, str]]:
    if not LEDGER.is_file():
        fail("docs/R6_ASSET_RECONCILIATION.csv is missing")
    with LEDGER.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        fields = set(reader.fieldnames or [])
        missing = REQUIRED_COLUMNS - fields
        if missing:
            fail(f"Asset ledger missing columns: {sorted(missing)}")
        rows = list(reader)
    if len(rows) != EXPECTED_COUNT:
        fail(f"Asset ledger must contain exactly {EXPECTED_COUNT} unresolved records; found {len(rows)}")
    return rows


def validate(rows: list[dict[str, str]], require_resolved: bool) -> None:
    ids = [row["asset_id"].strip() for row in rows]
    if len(set(ids)) != EXPECTED_COUNT:
        fail("Asset IDs must be unique")
    expected_ids = [f"R6-ASSET-{i:03d}" for i in range(1, EXPECTED_COUNT + 1)]
    if ids != expected_ids:
        fail("Asset IDs must remain stable and ordered R6-ASSET-001 through R6-ASSET-052")

    statuses = []
    for row in rows:
        asset_id = row["asset_id"].strip()
        status = row["status"].strip()
        statuses.append(status)
        if status not in ALLOWED_STATUSES:
            fail(f"{asset_id}: unsupported status {status!r}")

        if status != "PENDING":
            if not row["original_reference"].strip():
                fail(f"{asset_id}: resolved disposition requires original_reference")
            if not row["evidence"].strip():
                fail(f"{asset_id}: resolved disposition requires evidence")

        if status == "FOUND_VERIFIED" and not row["provenance_or_rights"].strip():
            fail(f"{asset_id}: FOUND_VERIFIED requires provenance_or_rights")
        if status == "RIGHTS_SAFE_REPLACEMENT":
            if not row["replacement_reference"].strip():
                fail(f"{asset_id}: RIGHTS_SAFE_REPLACEMENT requires replacement_reference")
            if not row["provenance_or_rights"].strip():
                fail(f"{asset_id}: RIGHTS_SAFE_REPLACEMENT requires provenance_or_rights")
        if status in {"QUARANTINED", "INTENTIONALLY_REMOVED"} and not row["notes"].strip():
            fail(f"{asset_id}: {status} requires explanatory notes")

    counts = Counter(statuses)
    print("R6_ASSET_LEDGER=PASS")
    for status in sorted(ALLOWED_STATUSES):
        print(f"{status}={counts.get(status, 0)}")

    if require_resolved:
        pending = counts.get("PENDING", 0)
        if pending:
            fail(f"Release gate blocked: {pending} unresolved asset records remain PENDING")
        if sum(counts.get(status, 0) for status in RESOLVED_STATUSES) != EXPECTED_COUNT:
            fail("Release gate blocked: not all 52 records have governed dispositions")
        print("R6_ASSET_RELEASE_GATE=PASS")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--require-resolved",
        action="store_true",
        help="fail unless all 52 unresolved references have a governed final disposition",
    )
    args = parser.parse_args()
    validate(load_rows(), args.require_resolved)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
