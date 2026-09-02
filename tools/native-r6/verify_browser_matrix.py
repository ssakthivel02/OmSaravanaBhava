#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter
from pathlib import Path

PATH = Path("docs/R6_BROWSER_QA_MATRIX.csv")
REQUIRED_AREAS = {
    "identity", "navigation", "routing", "songs", "thiruppugazh", "mantra",
    "temples", "search", "audio", "content", "i18n", "accessibility", "motion",
    "responsive", "pwa", "seo", "security", "performance", "integrity", "release",
}
ALLOWED = {"PENDING_SOURCE", "PENDING", "PASS", "FAIL", "NOT_APPLICABLE_WITH_EVIDENCE"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--require-pass", action="store_true")
    args = ap.parse_args()

    rows = list(csv.DictReader(PATH.open(encoding="utf-8", newline="")))
    if len(rows) != 40:
        raise SystemExit(f"QA matrix must contain exactly 40 cases; found {len(rows)}")

    expected = [f"R6-QA-{i:03d}" for i in range(1, 41)]
    actual = [r["case_id"] for r in rows]
    if actual != expected:
        raise SystemExit("QA case IDs must be contiguous R6-QA-001..R6-QA-040")

    areas = {r["area"] for r in rows}
    missing_areas = sorted(REQUIRED_AREAS - areas)
    if missing_areas:
        raise SystemExit("QA matrix missing required areas: " + ", ".join(missing_areas))

    for row in rows:
        if row["priority"] != "P0":
            raise SystemExit(f"{row['case_id']}: all current release cases must remain P0")
        if row["status"] not in ALLOWED:
            raise SystemExit(f"{row['case_id']}: invalid status {row['status']}")
        if not row["expected_evidence"].strip():
            raise SystemExit(f"{row['case_id']}: expected_evidence is required")

    counts = Counter(r["status"] for r in rows)
    print("R6_BROWSER_QA_MATRIX=PASS schema_cases=40 " + " ".join(f"{k}={v}" for k, v in sorted(counts.items())))

    if args.require_pass:
        blockers = [r for r in rows if r["status"] not in {"PASS", "NOT_APPLICABLE_WITH_EVIDENCE"}]
        if blockers:
            print("R6_BROWSER_QA_BLOCKERS=" + ",".join(r["case_id"] + ":" + r["status"] for r in blockers))
            return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
