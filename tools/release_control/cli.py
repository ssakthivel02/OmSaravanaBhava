"""Command-line interface for deterministic release governance."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .checks import validate_release
from .constants import DEFAULT_CONFIG
from .jsonio import dump_json


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate an OmSaravanaBhava release package or uploaded commit."
    )
    parser.add_argument("--root", default=".")
    parser.add_argument("--config", default=DEFAULT_CONFIG)
    parser.add_argument("--manifest", required=True)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--package-mode", action="store_true")
    mode.add_argument("--repository-mode", action="store_true")
    parser.add_argument("--report")
    parser.add_argument("--attestation")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    root = Path(args.root).resolve()
    config = root / args.config
    manifest = root / args.manifest
    report = validate_release(
        root=root,
        config_path=config,
        manifest_path=manifest,
        repository_mode=args.repository_mode,
    )
    payload = report.to_dict()
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    if args.report:
        dump_json(root / args.report, payload)
    if args.attestation:
        dump_json(root / args.attestation, report.attestation)
    return 0 if report.status == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
