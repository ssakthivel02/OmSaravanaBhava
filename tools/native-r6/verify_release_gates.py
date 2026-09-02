#!/usr/bin/env python3
"""Validate OmSaravanaBhava native R6 release-gate state."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
GATES_FILE = REPO_ROOT / "release" / "R6_RELEASE_GATES.json"
EXPECTED_PROJECT = "OmSaravanaBhava"
EXPECTED_CANDIDATE = "native-r6"
EXPECTED_SOURCE_SHA = "3477dd375e9545bd51482f9cacabe851adc6a841cdf111ffd5eb408f76c26585"
ALLOWED_NONPASS = {
    "PENDING",
    "BLOCKED_SOURCE_IMPORT",
    "PENDING_OWNER_APPROVAL",
    "BLOCKED",
    "NOT_APPLICABLE_APPROVED",
}


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def load() -> dict:
    if not GATES_FILE.is_file():
        fail("release/R6_RELEASE_GATES.json is missing")
    try:
        return json.loads(GATES_FILE.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        fail(f"Cannot parse R6 release gates: {exc}")


def validate(data: dict, require_pass: bool) -> None:
    if data.get("project") != EXPECTED_PROJECT:
        fail("Release gates project mismatch")
    if data.get("candidate") != EXPECTED_CANDIDATE:
        fail("Release gates candidate mismatch")
    authority = data.get("sourceAuthority") or {}
    if authority.get("sha256") != EXPECTED_SOURCE_SHA:
        fail("Release gates source SHA mismatch")
    if authority.get("importMode") != "native-source-only":
        fail("Release gates import mode must be native-source-only")

    gates = data.get("gates")
    if not isinstance(gates, list) or not gates:
        fail("Release gates list is missing or empty")

    ids: set[str] = set()
    required_nonpass: list[str] = []
    for gate in gates:
        gate_id = str(gate.get("id", "")).strip()
        status = str(gate.get("status", "")).strip()
        requirement = str(gate.get("requirement", "")).strip()
        if not gate_id or not requirement or not status:
            fail(f"Malformed gate entry: {gate!r}")
        if gate_id in ids:
            fail(f"Duplicate gate ID: {gate_id}")
        ids.add(gate_id)
        if status != "PASS" and status not in ALLOWED_NONPASS:
            fail(f"Unsupported status {status!r} for {gate_id}")
        if gate.get("required") is True and status != "PASS":
            required_nonpass.append(f"{gate_id}:{status}")

    print(f"R6_RELEASE_GATE_SCHEMA=PASS gates={len(gates)}")
    if required_nonpass:
        print("R6_REQUIRED_GATES_NOT_PASS=" + ",".join(required_nonpass))
    else:
        print("R6_REQUIRED_GATES=PASS")

    if require_pass:
        # Owner approval is represented by the production workflow input, but
        # every repository evidence gate must otherwise be explicitly PASS.
        allowed_owner = {"REL-002:PENDING_OWNER_APPROVAL"}
        blockers = [item for item in required_nonpass if item not in allowed_owner]
        if blockers:
            fail("Production blocked by required gates: " + ", ".join(blockers))
        print("R6_PRE_OWNER_PRODUCTION_GATES=PASS")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-pass", action="store_true")
    args = parser.parse_args()
    validate(load(), args.require_pass)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
