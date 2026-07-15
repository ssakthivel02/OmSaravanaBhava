"""Discover the highest numeric release manifest in a repository."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

_PATTERN = re.compile(r"^manifest-release-(\d+)\.json$")


def release_number(path: Path) -> int | None:
    match = _PATTERN.fullmatch(path.name)
    return int(match.group(1)) if match else None


def find_latest_manifest(root: Path) -> Path:
    candidates = []
    for path in root.glob("manifest-release-*.json"):
        number = release_number(path)
        if number is not None:
            candidates.append((number, path))
    if not candidates:
        raise FileNotFoundError("No manifest-release-N.json file was found")
    return max(candidates, key=lambda item: item[0])[1]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args(argv)
    root = Path(args.root).resolve()
    print(find_latest_manifest(root).relative_to(root).as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
