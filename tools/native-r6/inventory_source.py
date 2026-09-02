#!/usr/bin/env python3
"""Produce a deterministic, read-only inventory of the imported native R6 source.

The inventory is evidence, not a release decision. It intentionally avoids parsing or
rewriting devotional content. Output is JSON to stdout or to --output.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
NATIVE_ROOT = REPO_ROOT / "native-r6"
SKIP_DIRS = {"node_modules", ".git", "dist", "build", "coverage", ".cache", ".vite"}
TEXT_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".html", ".css", ".scss", ".md"}
ROUTE_RE = re.compile(r"(?:path\s*[:=]\s*|<Route[^>]+path\s*=\s*)[\"'`](/[^\"'`{} ]*)[\"'`]", re.I)
URL_RE = re.compile(r"https?://[^\s\"'`<>]+", re.I)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def safe_text(path: Path) -> str | None:
    if path.suffix.lower() not in TEXT_EXTENSIONS:
        return None
    try:
        return path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", help="optional JSON output path")
    args = parser.parse_args()

    if not (NATIVE_ROOT / "package.json").is_file():
        print("ERROR: native R6 source is not imported", file=sys.stderr)
        return 1

    extension_counts: Counter[str] = Counter()
    files: list[dict[str, object]] = []
    routes: set[str] = set()
    external_origins: set[str] = set()
    large_files: list[dict[str, object]] = []

    for path in sorted(NATIVE_ROOT.rglob("*")):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if not path.is_file():
            continue
        rel = path.relative_to(NATIVE_ROOT).as_posix()
        size = path.stat().st_size
        ext = path.suffix.lower() or "[no-extension]"
        extension_counts[ext] += 1
        record = {"path": rel, "bytes": size}
        if size <= 5 * 1024 * 1024:
            record["sha256"] = sha256(path)
        else:
            large_files.append({"path": rel, "bytes": size})
        files.append(record)

        text = safe_text(path)
        if text is None:
            continue
        routes.update(match.group(1) for match in ROUTE_RE.finditer(text))
        for match in URL_RE.finditer(text):
            url = match.group(0).rstrip(").,;]}")
            origin_match = re.match(r"(https?://[^/]+)", url)
            if origin_match:
                external_origins.add(origin_match.group(1))

    package = json.loads((NATIVE_ROOT / "package.json").read_text(encoding="utf-8"))
    inventory = {
        "project": "OmSaravanaBhava",
        "sourceRoot": "native-r6",
        "fileCount": len(files),
        "totalBytes": sum(int(item["bytes"]) for item in files),
        "extensions": dict(sorted(extension_counts.items())),
        "packageName": package.get("name"),
        "packageVersion": package.get("version"),
        "packageManager": package.get("packageManager"),
        "scripts": package.get("scripts", {}),
        "candidateRoutes": sorted(routes),
        "externalOrigins": sorted(external_origins),
        "largeFilesOver5MiB": large_files,
        "files": files,
    }

    rendered = json.dumps(inventory, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
