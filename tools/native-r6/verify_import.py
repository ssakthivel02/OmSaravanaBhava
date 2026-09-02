#!/usr/bin/env python3
"""Fail-closed validation for the imported OmSaravanaBhava R6 source.

This script intentionally uses only the Python standard library so it can run
before Node dependencies are installed. It validates repository hygiene,
provenance, package/build contract and obvious cross-project contamination.
It does not modify source files.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
NATIVE_ROOT = REPO_ROOT / "native-r6"
PROVENANCE = NATIVE_ROOT / "IMPORT_PROVENANCE.json"
EXPECTED_SOURCE = "OmSaravanaBhava_R6_FINAL_MANUS_MASTER_SOURCE.zip"
EXPECTED_SHA256 = "3477dd375e9545bd51482f9cacabe851adc6a841cdf111ffd5eb408f76c26585"

REQUIRED_FILES = (
    "package.json",
    "pnpm-lock.yaml",
    "IMPORT_PROVENANCE.json",
)

FORBIDDEN_DIR_NAMES = {
    "node_modules",
    ".pnpm-store",
    "dist",
    "build",
    "coverage",
    ".cache",
    ".vite",
    ".next",
    "tmp",
    "temp",
}

FORBIDDEN_FILE_PATTERNS = (
    re.compile(r"^\.env(?:\..+)?$", re.I),
    re.compile(r".+\.(?:pem|key|p12|pfx|jks|keystore)$", re.I),
    re.compile(r".+\.(?:zip|7z|rar|tar|tar\.gz)$", re.I),
)

# Technical project/repository identifiers only. Do not broaden this into
# devotional vocabulary; canonical Murugan content must never be rejected by
# a generic keyword filter.
FORBIDDEN_TECHNICAL_TOKENS = (
    "ssakthivel02/kandan-legacy",
    "kandan.omsaravanabhava.org",
    "ssakthivel02/kirthiverse",
    "ssakthivel02/ramaverse",
    "ssakthivel02/divyanexus",
    "ssakthivel02/osb-web",
    "sakthiai.omsaravanabhava.org",
    "saravanai.omsaravanabhava.org",
)

TEXT_EXTENSIONS = {
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json", ".html",
    ".css", ".scss", ".sass", ".less", ".md", ".txt", ".xml", ".yml",
    ".yaml", ".toml", ".svg", ".env", ".sh", ".ps1", ".py",
}


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001 - fail closed with exact file context
        fail(f"Cannot parse JSON {path.relative_to(REPO_ROOT)}: {exc}")


def validate_provenance() -> None:
    if not PROVENANCE.is_file():
        fail("native-r6/IMPORT_PROVENANCE.json is missing")
    data = read_json(PROVENANCE)
    expected = {
        "project": "OmSaravanaBhava",
        "sourcePackage": EXPECTED_SOURCE,
        "sourceSha256": EXPECTED_SHA256,
        "importMode": "native-source-only",
        "productionAuthorized": False,
    }
    for key, value in expected.items():
        if data.get(key) != value:
            fail(f"Import provenance mismatch for {key!r}: expected {value!r}, got {data.get(key)!r}")


def validate_required_files() -> None:
    if not NATIVE_ROOT.is_dir():
        fail("native-r6 directory is missing")
    for rel in REQUIRED_FILES:
        path = NATIVE_ROOT / rel
        if not path.is_file() or path.stat().st_size == 0:
            fail(f"Required native source file missing or empty: native-r6/{rel}")


def validate_package_contract() -> None:
    package = read_json(NATIVE_ROOT / "package.json")
    scripts = package.get("scripts") or {}
    if not isinstance(scripts, dict) or not scripts.get("build"):
        fail("native-r6/package.json must define a non-empty scripts.build command")

    pm = package.get("packageManager")
    if pm is not None and not str(pm).lower().startswith("pnpm@"):
        fail(f"packageManager must be pnpm when declared; got {pm!r}")


def validate_repository_hygiene() -> None:
    for root, dirs, files in os.walk(NATIVE_ROOT):
        root_path = Path(root)
        for dirname in list(dirs):
            if dirname in FORBIDDEN_DIR_NAMES:
                fail(f"Forbidden generated/local directory committed: {(root_path / dirname).relative_to(REPO_ROOT)}")
        for filename in files:
            for pattern in FORBIDDEN_FILE_PATTERNS:
                if pattern.fullmatch(filename):
                    fail(f"Forbidden local/archive/secret-like file committed: {(root_path / filename).relative_to(REPO_ROOT)}")


def validate_no_cross_project_technical_imports() -> None:
    hits: list[str] = []
    for path in NATIVE_ROOT.rglob("*"):
        if not path.is_file() or path == PROVENANCE:
            continue
        if path.suffix.lower() not in TEXT_EXTENSIONS and path.name not in {"package.json", "pnpm-lock.yaml"}:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="strict").lower()
        except UnicodeDecodeError:
            continue
        for token in FORBIDDEN_TECHNICAL_TOKENS:
            if token.lower() in text:
                hits.append(f"{path.relative_to(REPO_ROOT)} -> {token}")
    if hits:
        fail("Cross-project technical contamination detected:\n  " + "\n  ".join(sorted(hits)))


def main() -> int:
    validate_provenance()
    validate_required_files()
    validate_package_contract()
    validate_repository_hygiene()
    validate_no_cross_project_technical_imports()
    print("NATIVE_R6_IMPORT_VALIDATION=PASS")
    print(f"SOURCE_AUTHORITY={EXPECTED_SOURCE}")
    print(f"SOURCE_SHA256={EXPECTED_SHA256}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
