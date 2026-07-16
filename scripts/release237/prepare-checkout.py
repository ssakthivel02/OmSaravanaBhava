#!/usr/bin/env python3
"""Copy declared Release 237 files and stage declared deletions."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path


def run(command: list[str], cwd: Path) -> None:
    result = subprocess.run(command, cwd=cwd, check=False)
    if result.returncode:
        raise SystemExit(result.returncode)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--package-root", required=True)
    parser.add_argument("--repository-root", required=True)
    parser.add_argument(
        "--manifest",
        default="manifest-release-237.json",
    )
    args = parser.parse_args()

    package_root = Path(args.package_root).resolve()
    repository_root = Path(args.repository_root).resolve()
    manifest_path = package_root / args.manifest
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    copied: list[str] = []
    for key in ("added_files", "modified_files"):
        for raw in manifest.get(key, []):
            relative = str(raw)
            source = package_root / relative
            destination = repository_root / relative
            if not source.is_file():
                raise SystemExit(
                    f"Package source is missing: {relative}"
                )
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
            copied.append(relative)

    deleted = [str(path) for path in manifest.get("deleted_files", [])]
    if deleted:
        run(
            [
                "git",
                "rm",
                "-f",
                "--ignore-unmatch",
                "--",
                *deleted,
            ],
            repository_root,
        )

    declared = sorted(set(copied + deleted))
    if copied:
        run(["git", "add", "--", *sorted(set(copied))], repository_root)

    print(json.dumps({
        "copied": len(copied),
        "deleted": len(deleted),
        "declared": len(declared),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
