#!/usr/bin/env python3
from __future__ import annotations
import argparse, json
from pathlib import Path
from .constants import CONTRACT_PATH, MANIFEST_PATH, POLICY_PATH
from .git import parent, staged, subject, tracked
from .jsonio import load
from .validator import validate

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--mode", choices=("package", "staged", "final"), required=True)
    args = parser.parse_args()
    root = Path(args.root).resolve()
    report = validate(
        root=root,
        policy=load(root / POLICY_PATH),
        contract=load(root / CONTRACT_PATH),
        manifest=load(root / MANIFEST_PATH),
        mode=args.mode,
        tracked=tracked(root) if (root / ".git").exists() else None,
        staged=staged(root) if args.mode == "staged" else None,
        parent=parent(root) if args.mode == "final" else None,
        subject=subject(root) if args.mode == "final" else None,
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "PASS" else 1

if __name__ == "__main__":
    raise SystemExit(main())
