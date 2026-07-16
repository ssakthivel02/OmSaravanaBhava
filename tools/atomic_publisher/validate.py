#!/usr/bin/env python3
"""CLI for Release 239 atomic publishing validation."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .git import staged, tracked
from .jsonio import load_json
from .validator import validate_atomic_publish_plan


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--mode", choices=("package", "staged", "final"), required=True)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    policy = load_json(root / "policies/atomic-publisher.json")
    contract = load_json(root / "data/atomic-publisher.json")
    manifest = load_json(root / "manifest-release-239.json")

    report = validate_atomic_publish_plan(
        root=root,
        policy=policy,
        contract=contract,
        manifest=manifest,
        staged_changes=staged(root) if args.mode == "staged" else None,
        tracked_after=tracked(root) if args.mode == "final" else None,
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
