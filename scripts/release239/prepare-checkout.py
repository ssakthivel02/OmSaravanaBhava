#!/usr/bin/env python3
"""Apply the Release 239 manifest to a clean repository clone."""

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
    args = parser.parse_args()

    package = Path(args.package_root).resolve()
    repository = Path(args.repository_root).resolve()
    manifest = json.loads(
        (package / "manifest-release-239.json")
        .read_text(encoding="utf-8")
    )

    copied: list[str] = []
    for key in ("added_files", "modified_files"):
        for relative in manifest.get(key, []):
            source = package / relative
            destination = repository / relative
            if not source.is_file():
                raise SystemExit(f"Package file is missing: {relative}")
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
            copied.append(relative)

    deleted = [str(path) for path in manifest.get("deleted_files", [])]
    tracked_before = set(
        subprocess.run(
            ["git", "ls-files"],
            cwd=repository,
            stdout=subprocess.PIPE,
            text=True,
            check=True,
        ).stdout.splitlines()
    )
    missing = sorted(set(deleted) - tracked_before)
    if missing:
        raise SystemExit(
            "Deletion targets are not tracked at the approved base:\n" +
            "\n".join(missing)
        )

    run(["git", "rm", "-f", "--", *deleted], repository)
    run(["git", "add", "--", *sorted(set(copied))], repository)

    print(json.dumps({
        "copied": len(copied),
        "deleted": len(deleted),
        "declared": len(set(copied + deleted)),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
