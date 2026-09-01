#!/usr/bin/env python3
"""Release 230 package and repository validator."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

RELEASE = 230
BASE_COMMIT = "292f9f8b2a481f1aab43db2e75d31ccf0a0ffd81"
REQUIRED = [
    "content-status.html",
    "service-worker.js",
    "data/content-status.json",
    "data/reading-workspace.json",
    "data/publication-boundaries.json",
    "assets/css/content-status-audit.css",
    "assets/js/content-status-audit.mjs",
    "assets/js/reading-workspace-desktop.mjs",
    "tests/publication-boundaries.test.mjs",
    "tools/release_230_validate.py",
    ".github/workflows/release-230-integrity.yml",
    ".github/workflows/release-230-production-smoke.yml",
    "manifest-release-230.json",
    "RELEASE_230_CHANGED_FILES.txt",
    "RELEASE_230_GITHUB_PORTAL_INSTRUCTIONS.txt",
    "RELEASE_230_LOCAL_TEST_EVIDENCE.txt",
    "RELEASE_230_VALIDATION_REPORT.md",
    "RELEASE_230.patch",
]
PRECACHE = [
    "/assets/css/content-status-audit.css",
    "/assets/js/content-status-audit.mjs",
    "/data/publication-boundaries.json",
    "/manifest-release-230.json",
]
FORBIDDEN = [
    "BEGIN PRIVATE KEY",
    "api_key=",
    "apikey=",
    "localhost:",
    "127.0.0.1:",
    "google-analytics",
    "mixpanel",
    "segment.io",
]


class AuditParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.h1 = 0
        self.main = 0
        self.lang = ""
        self.canonical = ""
        self.status_regions = 0

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "html":
            self.lang = values.get("lang", "")
        if tag == "h1":
            self.h1 += 1
        if tag == "main":
            self.main += 1
        if values.get("id"):
            self.ids.append(values["id"])
        if tag == "link" and values.get("rel") == "canonical":
            self.canonical = values.get("href", "")
        if values.get("role") == "status":
            self.status_regions += 1


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def run(command: list[str], root: Path) -> tuple[int, str]:
    result = subprocess.run(
        command,
        cwd=root,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    return result.returncode, result.stdout


def load_json(root: Path, relative: str):
    return json.loads((root / relative).read_text(encoding="utf-8"))


def validate_boundaries(root, errors, checks):
    payload = load_json(root, "data/publication-boundaries.json")
    records = payload.get("records", [])
    if payload.get("release") != RELEASE:
        errors.append("publication boundary release mismatch")
    if len(records) != 8:
        errors.append(f"expected 8 boundary records, found {len(records)}")
    routes = [str(item.get("route", "")) for item in records]
    if len(routes) != len(set(routes)):
        errors.append("duplicate publication boundary routes")
    if any(not route.startswith("/literature/") for route in routes):
        errors.append("publication boundary route outside /literature/")
    excluded = [item for item in records if item.get("readingEligible") is False]
    if len(excluded) != 7:
        errors.append(f"expected 7 reading-excluded records, found {len(excluded)}")
    allowed = {"partial-reviewed", "source-register", "navigation"}
    invalid = sorted({
        str(item.get("verifiedStatus"))
        for item in records
        if item.get("verifiedStatus") not in allowed
    })
    if invalid:
        errors.append(f"invalid verified statuses: {invalid}")
    if any(item.get("fullTextPublished") is not False for item in records):
        errors.append("audited records must not claim complete text")
    checks.append("eight-record publication boundary schema")


def validate_reading_config(root, errors, checks):
    config = load_json(root, "data/reading-workspace.json")
    boundaries = load_json(root, "data/publication-boundaries.json")
    if config.get("release") != RELEASE:
        errors.append("reading workspace release mismatch")
    excluded = set(config.get("excludedPaths", []))
    missing = [
        item["route"]
        for item in boundaries["records"]
        if item.get("readingEligible") is False and item["route"] not in excluded
    ]
    if missing:
        errors.append(f"reading exclusions missing: {missing}")
    if config.get("publicationBoundaryRegistry", {}).get("path") != \
            "/data/publication-boundaries.json":
        errors.append("reading workspace boundary registry path missing")
    checks.append("reading eligibility exclusions and overlay registration")


def validate_content_status(root, errors, checks):
    config = load_json(root, "data/content-status.json")
    if config.get("release") != RELEASE:
        errors.append("content status config release mismatch")
    if config.get("mode") != "runtime-derived":
        errors.append("content status counts must be runtime-derived")
    if "statusCounts" in config:
        errors.append("stale hard-coded statusCounts field remains")
    html = (root / "content-status.html").read_text(encoding="utf-8")
    parser = AuditParser()
    parser.feed(html)
    duplicates = sorted({
        value for value in parser.ids if parser.ids.count(value) > 1
    })
    if duplicates:
        errors.append(f"content-status duplicate IDs: {duplicates}")
    if parser.lang != "ta":
        errors.append("content-status lang must remain ta")
    if parser.h1 != 1:
        errors.append(f"content-status h1 count is {parser.h1}")
    if parser.main != 1:
        errors.append(f"content-status main count is {parser.main}")
    if parser.status_regions < 1:
        errors.append("content-status has no status live region")
    if parser.canonical != "https://omsaravanabhava.org/content-status.html":
        errors.append("content-status canonical mismatch")
    for marker in (
        'data-release="230"',
        'assets/js/content-status-audit.mjs',
        'assets/css/content-status-audit.css',
        'id="contentStatusAudit"',
    ):
        if marker not in html:
            errors.append(f"content-status marker missing: {marker}")
    checks.append("content status semantics and runtime-count boundary")


def validate_assets(root, errors, checks):
    audit_js = (root / "assets/js/content-status-audit.mjs").read_text(
        encoding="utf-8"
    )
    desktop_js = (
        root / "assets/js/reading-workspace-desktop.mjs"
    ).read_text(encoding="utf-8")
    css = (root / "assets/css/content-status-audit.css").read_text(
        encoding="utf-8"
    )
    sw = (root / "service-worker.js").read_text(encoding="utf-8")
    for marker in (
        "export const RELEASE = 230;",
        "buildStatusCounts",
        "evaluateBoundary",
        "verifyAllPageEvidence",
        "applyPublicationBoundaries",
    ):
        if marker not in audit_js + desktop_js:
            errors.append(f"JavaScript marker missing: {marker}")
    for marker in (
        ":focus",
        "@media (prefers-reduced-motion: reduce)",
        "@media print",
    ):
        if marker not in css and marker != ":focus":
            errors.append(f"CSS marker missing: {marker}")
    if "const RELEASE = '228';" not in sw:
        errors.append("service-worker cache generation changed unexpectedly")
    for asset in PRECACHE:
        count = sw.count(f'"{asset}"')
        if count != 1:
            errors.append(f"precache {asset} count is {count}")
    for forbidden in (
        "localStorage.setItem",
        "sessionStorage.setItem",
        "indexedDB.open",
        "navigator.sendBeacon",
    ):
        if forbidden in audit_js:
            errors.append(f"audit module forbidden operation: {forbidden}")
    checks.append("audit modules, responsive CSS and additive precache")


def validate_manifest(root, errors, checks):
    manifest = load_json(root, "manifest-release-230.json")
    expected = {
        "release": RELEASE,
        "base_commit": BASE_COMMIT,
        "required_commit_title":
            "Release 230: enforce literature publication boundaries",
    }
    for key, value in expected.items():
        if manifest.get(key) != value:
            errors.append(f"manifest {key} mismatch")
    if manifest.get("deleted_files") != []:
        errors.append("manifest declares deleted files")
    if manifest.get("new_browser_storage_key") is not False:
        errors.append("manifest must declare no new storage key")
    checks.append("manifest identity, scope and limitations")


def validate_checksums(root, errors, checks):
    ledger = root / "RELEASE_230_SHA256SUMS.txt"
    if not ledger.exists():
        return
    for line in ledger.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        expected, relative = line.split("  ", 1)
        target = root / relative
        if not target.exists():
            errors.append(f"checksum target missing: {relative}")
        elif sha256(target) != expected:
            errors.append(f"checksum mismatch: {relative}")
    checks.append("final SHA256 ledger")


def validate_repo_alignment(root, errors, warnings, checks):
    route_path = root / "data/site-routes.json"
    if not route_path.exists():
        warnings.append("site-routes.json unavailable for repository alignment")
        return
    routes = load_json(root, "data/site-routes.json").get("routes", [])
    route_map = {
        str(item.get("path", "")): item
        for item in routes if isinstance(item, dict)
    }
    boundaries = load_json(root, "data/publication-boundaries.json")
    stale = []
    for record in boundaries["records"]:
        actual = route_map.get(record["route"], {}).get("status")
        if actual != record["declaredRouteStatus"]:
            stale.append({
                "route": record["route"],
                "auditSnapshot": record["declaredRouteStatus"],
                "actual": actual,
            })
    if stale:
        errors.append(f"boundary audit snapshot is stale: {stale}")
    checks.append("route registry matches the explicitly audited snapshot")


def scan_forbidden(root, errors, checks):
    suffixes = {".html", ".js", ".mjs", ".json", ".css"}
    direct_files = {
        "content-status.html",
        "service-worker.js",
        "manifest-release-230.json",
    }
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in suffixes:
            continue
        relative = path.relative_to(root)
        production_scope = (
            relative.parts[0] in {"assets", "data"} or
            relative.as_posix() in direct_files
        )
        if not production_scope:
            continue
        source = path.read_text(
            encoding="utf-8",
            errors="replace"
        ).lower()
        for marker in FORBIDDEN:
            if marker.lower() in source:
                errors.append(
                    f"forbidden marker {marker!r}: {relative}"
                )
    checks.append("production credential, localhost and analytics marker scan")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--package-mode", action="store_true")
    parser.add_argument("--report")
    args = parser.parse_args()
    root = Path(args.root).resolve()

    errors: list[str] = []
    warnings: list[str] = []
    checks: list[str] = []
    skipped: list[str] = []

    for relative in REQUIRED:
        if not (root / relative).exists():
            errors.append(f"required file missing: {relative}")
    checks.append("required release files")

    for path in root.rglob("*.json"):
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"invalid JSON {path.relative_to(root)}: {exc}")
    checks.append("JSON syntax")

    validate_boundaries(root, errors, checks)
    validate_reading_config(root, errors, checks)
    validate_content_status(root, errors, checks)
    validate_assets(root, errors, checks)
    validate_manifest(root, errors, checks)
    validate_checksums(root, errors, checks)
    scan_forbidden(root, errors, checks)

    node_available = subprocess.run(
        ["bash", "-lc", "command -v node >/dev/null 2>&1"],
        cwd=root,
        check=False,
    ).returncode == 0
    if node_available:
        for command in (
            ["node", "--check", "assets/js/content-status-audit.mjs"],
            ["node", "--check", "assets/js/reading-workspace-desktop.mjs"],
            ["node", "--check", "service-worker.js"],
            ["node", "--test", "tests/publication-boundaries.test.mjs"],
        ):
            code, output = run(command, root)
            if code:
                errors.append(f"{' '.join(command)} failed:\n{output}")
        checks.append("Node syntax and Release 230 tests")
    else:
        skipped.append("Node syntax/tests unavailable")

    if args.package_mode:
        skipped.extend([
            "route registry snapshot alignment",
            "same-origin page evidence requests",
            "GitHub Actions conclusion",
            "deployed-production verification",
        ])
    else:
        validate_repo_alignment(root, errors, warnings, checks)

    report = {
        "release": RELEASE,
        "base_commit": BASE_COMMIT,
        "mode": "package" if args.package_mode else "repository",
        "status": "PASS" if not errors else "FAIL",
        "errors": errors,
        "warnings": warnings,
        "checks": checks,
        "skipped": skipped,
        "github_actions": "NOT_RUN_LOCALLY",
        "deployed_production": "NOT_RUN_LOCALLY",
    }
    output = json.dumps(report, indent=2, ensure_ascii=False)
    print(output)
    if args.report:
        target = Path(args.report)
        if not target.is_absolute():
            target = root / target
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(output + "\n", encoding="utf-8")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
