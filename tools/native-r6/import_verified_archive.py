#!/usr/bin/env python3
"""Safely stage the authoritative OmSaravanaBhava R6 source archive.

This tool is intentionally fail-closed. It accepts only the known authoritative
R6 archive hashes and never writes directly into production. The output is a
local staging directory that can be inspected before any Git import.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import stat
import sys
import zipfile
from pathlib import Path, PurePosixPath

DIRECT = {
    "name": "OmSaravanaBhava_R6_FINAL_MANUS_MASTER_SOURCE.zip",
    "sha256": "3477dd375e9545bd51482f9cacabe851adc6a841cdf111ffd5eb408f76c26585",
    "prefix": "",
}
PORTFOLIO = {
    "name": "MANUS_ALL_WEBSITES_LATEST_EXPORT_2026-08-27.zip",
    "sha256": "47eef4cb07a6d466ad370d3923ec972ae43a916b18081ed85182d2b32da3ddfc",
    "prefix": "01_OmSaravanaBhava/source/R6_FINAL_MASTER/",
}
ACCEPTED = {DIRECT["sha256"]: DIRECT, PORTFOLIO["sha256"]: PORTFOLIO}

BLOCKED_PARTS = {
    "node_modules", ".pnpm-store", "dist", "build", "coverage", ".cache",
    ".vite", ".turbo", ".next", ".git", ".idea", ".vscode", "tmp", "temp",
}
BLOCKED_SUFFIXES = {
    ".pem", ".key", ".p12", ".pfx", ".jks", ".keystore", ".log", ".zip",
    ".7z", ".rar", ".tar", ".gz",
}
BLOCKED_NAMES = {".env", ".env.local", ".env.production", ".env.development"}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def normalize_member(name: str) -> PurePosixPath:
    p = PurePosixPath(name)
    if p.is_absolute() or ".." in p.parts:
        raise ValueError(f"Unsafe archive member path: {name}")
    return p


def is_symlink(info: zipfile.ZipInfo) -> bool:
    mode = info.external_attr >> 16
    return stat.S_ISLNK(mode)


def blocked(rel: PurePosixPath) -> bool:
    if any(part in BLOCKED_PARTS for part in rel.parts):
        return True
    if rel.name in BLOCKED_NAMES or rel.name.startswith(".env."):
        return True
    lower = rel.name.lower()
    return any(lower.endswith(s) for s in BLOCKED_SUFFIXES)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("archive", type=Path)
    ap.add_argument(
        "--output",
        type=Path,
        default=Path("native-r6-import-staging"),
        help="Fresh local staging directory; never production/native-r6 directly.",
    )
    args = ap.parse_args()

    archive = args.archive.resolve()
    if not archive.is_file():
        raise SystemExit(f"Archive not found: {archive}")

    digest = sha256(archive)
    spec = ACCEPTED.get(digest)
    if not spec:
        raise SystemExit(
            "REFUSED: archive SHA-256 is not an approved R6 authority: " + digest
        )

    out = args.output.resolve()
    if out.name == "native-r6":
        raise SystemExit("REFUSED: importer never writes directly to native-r6")
    if out.exists():
        raise SystemExit(f"REFUSED: staging output already exists: {out}")
    out.mkdir(parents=True)

    prefix = PurePosixPath(spec["prefix"])
    extracted = 0
    skipped = 0
    total_bytes = 0

    try:
        with zipfile.ZipFile(archive) as zf:
            for info in zf.infolist():
                member = normalize_member(info.filename)
                if is_symlink(info):
                    raise ValueError(f"Symlink member refused: {info.filename}")
                if info.is_dir():
                    continue

                if spec["prefix"]:
                    try:
                        rel = member.relative_to(prefix)
                    except ValueError:
                        continue
                else:
                    rel = member
                    # Some direct exports contain one wrapper directory. Keep it
                    # only if it is clearly the R6 root; otherwise preserve paths.
                    if len(rel.parts) > 1 and rel.parts[0] in {
                        "R6_FINAL_MASTER", "OmSaravanaBhava_R6_FINAL_MANUS_MASTER_SOURCE"
                    }:
                        rel = PurePosixPath(*rel.parts[1:])

                if not rel.parts or blocked(rel):
                    skipped += 1
                    continue

                dest = out.joinpath(*rel.parts)
                dest.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(info, "r") as src, dest.open("wb") as dst:
                    shutil.copyfileobj(src, dst)
                extracted += 1
                total_bytes += info.file_size
    except Exception:
        shutil.rmtree(out, ignore_errors=True)
        raise

    package = out / "package.json"
    if not package.is_file():
        shutil.rmtree(out, ignore_errors=True)
        raise SystemExit("REFUSED: staged R6 root does not contain package.json")

    package_data = json.loads(package.read_text(encoding="utf-8"))
    scripts = package_data.get("scripts") or {}
    if "build" not in scripts:
        shutil.rmtree(out, ignore_errors=True)
        raise SystemExit("REFUSED: staged R6 package.json has no build script")

    evidence = {
        "project": "OmSaravanaBhava",
        "acceptedArchive": spec["name"],
        "archiveSha256": digest,
        "selectedPrefix": spec["prefix"],
        "stagedFiles": extracted,
        "skippedRuntimeOrSensitiveEntries": skipped,
        "stagedBytes": total_bytes,
        "productionAuthorized": False,
        "next": "Inspect staging, run inventory/contamination checks, then import into native-r6.",
    }
    (out / "R6_IMPORT_EVIDENCE.json").write_text(
        json.dumps(evidence, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(json.dumps(evidence, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
