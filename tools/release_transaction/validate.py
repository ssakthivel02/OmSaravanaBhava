#!/usr/bin/env python3
"""CLI for Release 238 transaction validation."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .git import parent, subject, tracked
from .jsonio import load_json
from .validator import validate_transaction


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--mode", choices=("bootstrap", "final"), required=True)
    parser.add_argument("--bootstrap-commit", default="")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    policy = load_json(root / "policies/release-transaction.json")
    transaction = load_json(root / "data/release-238-transaction.json")
    plan = load_json(root / "data/release-238-deletion-plan.json")
    report = validate_transaction(
        root=root,
        policy=policy,
        transaction=transaction,
        plan=plan,
        mode=args.mode,
        parent=parent(root),
        subject=subject(root),
        bootstrap_commit=args.bootstrap_commit,
        tracked_paths=tracked(root),
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
