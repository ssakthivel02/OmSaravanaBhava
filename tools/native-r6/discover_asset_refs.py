#!/usr/bin/env python3
"""Discover local visual/audio/font asset references in native R6 source.

The report is evidence only: it never invents replacements or marks rights status.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

TEXT_EXTS = {".ts", ".tsx", ".js", ".jsx", ".css", ".scss", ".html", ".json", ".md"}
ASSET_EXTS = (
    ".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg", ".gif",
    ".mp3", ".m4a", ".wav", ".ogg", ".aac", ".mp4", ".webm",
    ".woff", ".woff2", ".ttf", ".otf",
)
IGNORE_PARTS = {"node_modules", "dist", "build", "coverage", ".git", ".cache", ".vite"}
REF_RE = re.compile(r"(?P<q>['\"])(?P<ref>[^'\"?#]+(?:" + "|".join(re.escape(x) for x in ASSET_EXTS) + r"))(?P=q)", re.IGNORECASE)


def candidate_paths(source_file: Path, ref: str, root: Path):
    clean = ref.replace("\\", "/")
    if clean.startswith(("http://", "https://", "data:", "blob:")):
        return []
    if clean.startswith("/"):
        rel = clean.lstrip("/")
        return [root / "public" / rel, root / rel]
    return [source_file.parent / clean, root / "public" / clean]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=Path("native-r6"))
    ap.add_argument("--output", type=Path, default=Path("release/R6_DISCOVERED_ASSETS.json"))
    args = ap.parse_args()
    root = args.root.resolve()
    if not (root / "package.json").is_file():
        raise SystemExit("Native R6 source not imported: package.json missing")

    refs = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in TEXT_EXTS:
            continue
        if any(part in IGNORE_PARTS for part in path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for line_no, line in enumerate(text.splitlines(), start=1):
            for m in REF_RE.finditer(line):
                ref = m.group("ref")
                paths = candidate_paths(path, ref, root)
                exists = any(p.resolve().is_file() for p in paths) if paths else None
                refs.append({
                    "source": path.relative_to(root).as_posix(),
                    "line": line_no,
                    "reference": ref,
                    "local": bool(paths),
                    "exists": exists,
                })

    unique = {}
    for item in refs:
        key = item["reference"]
        entry = unique.setdefault(key, {"reference": key, "occurrences": 0, "local": item["local"], "exists": item["exists"], "sources": []})
        entry["occurrences"] += 1
        if len(entry["sources"]) < 25:
            entry["sources"].append({"file": item["source"], "line": item["line"]})
        if item["exists"] is True:
            entry["exists"] = True

    items = sorted(unique.values(), key=lambda x: x["reference"].lower())
    missing = [x for x in items if x["local"] and x["exists"] is False]
    kinds = Counter(Path(x["reference"]).suffix.lower() for x in items)
    report = {
        "schemaVersion": 1,
        "project": "OmSaravanaBhava",
        "candidate": "native-r6",
        "totalOccurrences": len(refs),
        "uniqueReferences": len(items),
        "missingLocalReferences": len(missing),
        "byExtension": dict(sorted(kinds.items())),
        "references": items,
        "missing": missing,
        "note": "Discovery is technical existence evidence only. Rights/provenance require separate governed review.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"R6_ASSET_DISCOVERY unique={len(items)} missing_local={len(missing)}")
    return 2 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
