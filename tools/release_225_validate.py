#!/usr/bin/env python3
"""Validate Release 225 without claiming remote CI or deployment results."""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

RELEASE = "225"
BASE_COMMIT = "3600bf1b301d2240f3bdb7f8edbcbe8e552e916c"
ROUTE = "/personal-data.html"
REQUIRED = [
    "personal-data.html",
    "assets/css/personal-data.css",
    "assets/js/personal-data.mjs",
    "data/personal-data-registry.json",
    "index.html",
    "platform.html",
    "discovery.html",
    "reading-workspace.html",
    "reading-notes.html",
    "maintenance.html",
    "assets/js/maintenance-centre.mjs",
    "data/maintenance-checks.json",
    "data/site-routes.json",
    "sitemap.xml",
    "service-worker.js",
    "quality/site-audit-config.json",
    "tools/production_smoke.py",
    "tests/test_site_audit.py",
    "tests/personal-data.test.mjs",
    "tests/maintenance-centre.test.mjs",
    ".github/workflows/static-site-integrity.yml",
    ".github/workflows/production-smoke.yml",
    "manifest-release-225.json",
]

def read(root: Path, relative: str) -> str:
    return (root / relative).read_text(encoding="utf-8")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--package-mode", action="store_true")
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("artifacts/release-225-validation.json")
    )
    args = parser.parse_args()
    root = args.root.resolve()
    errors: list[str] = []
    checks: list[str] = []

    for relative in REQUIRED:
        if not (root / relative).is_file():
            errors.append(f"missing required file: {relative}")
        else:
            checks.append(f"exists: {relative}")

    if not errors:
        manifest = json.loads(read(root, "manifest-release-225.json"))
        registry = json.loads(read(root, "data/personal-data-registry.json"))
        routes = json.loads(read(root, "data/site-routes.json"))
        maintenance = json.loads(read(root, "data/maintenance-checks.json"))
        config = json.loads(read(root, "quality/site-audit-config.json"))
        ET.fromstring(read(root, "sitemap.xml"))

        if manifest.get("release") != 225:
            errors.append("manifest release is not 225")
        if manifest.get("base_commit") != BASE_COMMIT:
            errors.append("manifest base commit does not match Release 224 head")
        if registry.get("release") != 225:
            errors.append("personal-data registry release is not 225")
        if registry.get("builtAgainstCommit") != BASE_COMMIT:
            errors.append("personal-data registry base commit is incorrect")
        if registry.get("schema") != "osb-personal-data-backup-v1":
            errors.append("personal-data backup schema is incorrect")
        if routes.get("release") != 225:
            errors.append("route directory release is not 225")
        if maintenance.get("release") != 225:
            errors.append("maintenance registry release is not 225")
        if maintenance.get("builtAgainstCommit") != BASE_COMMIT:
            errors.append("maintenance registry base commit is incorrect")

        datasets = registry.get("datasets", [])
        ids = [
            item.get("id")
            for item in datasets
            if isinstance(item, dict)
        ]
        expected_ids = [
            "readingList",
            "readingProgress",
            "readingNotes",
            "accessibility",
            "audioHistory",
        ]
        if ids != expected_ids:
            errors.append(f"registered dataset order differs: {ids}")
        if len(ids) != len(set(ids)):
            errors.append("duplicate personal-data dataset ids")
        if registry.get("maximumImportBytes") != 1048576:
            errors.append("maximum import size must remain 1 MB")

        storage_keys = [
            item.get("storageKey")
            for item in datasets
            if isinstance(item, dict)
        ]
        expected_keys = {
            "osb-reading-list-v1",
            "osb-reading-progress-v1",
            "osb-reading-notes-v1",
            "osb-accessibility-preferences-v1",
            "osb-audio-listening-history-v1",
        }
        if set(storage_keys) != expected_keys:
            errors.append("registered storage keys differ from bounded set")

        route_records = routes.get("routes", [])
        route_paths = [
            item.get("path")
            for item in route_records
            if isinstance(item, dict)
        ]
        if route_paths.count(ROUTE) != 1:
            errors.append("personal-data route must appear exactly once")
        if len(route_paths) != len(set(route_paths)):
            errors.append("duplicate route-directory paths detected")
        route = next(
            (item for item in route_records if item.get("path") == ROUTE),
            None
        )
        if route and route.get("status") != "utility":
            errors.append("personal-data route must remain utility")

        if config.get("expectedRelease") != RELEASE:
            errors.append("site-audit expectedRelease is not 225")
        for relative in (
            "personal-data.html",
            "assets/css/personal-data.css",
            "assets/js/personal-data.mjs",
            "data/personal-data-registry.json",
            "manifest-release-225.json",
        ):
            if relative not in config.get("requiredFiles", []):
                errors.append(f"site audit does not require {relative}")

        sitemap = read(root, "sitemap.xml")
        if sitemap.count(
            "https://omsaravanabhava.org/personal-data.html"
        ) != 1:
            errors.append("sitemap must contain personal-data route once")

        worker = read(root, "service-worker.js")
        if "const RELEASE = '225';" not in worker:
            errors.append("service-worker identity is not 225")
        core = re.search(
            r"const CORE_PRECACHE_URLS = \[(.*?)\];",
            worker,
            re.S
        )
        optional = re.search(
            r"const PRECACHE_URLS = \[(.*?)\];",
            worker,
            re.S
        )
        core_text = core.group(1) if core else ""
        optional_text = optional.group(1) if optional else ""
        for asset in (
            "/personal-data.html",
            "/assets/css/personal-data.css",
            "/assets/js/personal-data.mjs",
            "/data/personal-data-registry.json",
            "/manifest-release-225.json",
        ):
            if f'"{asset}"' not in optional_text:
                errors.append(f"optional precache missing {asset}")
            if f'"{asset}"' in core_text:
                errors.append(
                    f"personal-data asset incorrectly blocks installation: {asset}"
                )
        if "cacheOptionalAssets" not in worker:
            errors.append("resilient optional caching is missing")

        module = read(root, "assets/js/personal-data.mjs")
        for marker in (
            "export const RELEASE = 225;",
            "osb-personal-data-backup-v1",
            "sanitiseReadingList",
            "sanitiseReadingProgress",
            "sanitiseReadingNotes",
            "sanitiseAccessibility",
            "sanitiseAudioHistory",
            "validateBackup",
            "applyValidatedBackup",
            "mergeArrayDataset",
            "sha256Hex",
        ):
            if marker not in module:
                errors.append(f"personal-data module missing marker: {marker}")
        for prohibited in (
            "navigator.sendBeacon",
            "gtag(",
            "google-analytics",
            "api.openai.com",
            "localStorage.clear(",
            "sessionStorage",
            "selectedText:",
            "pageBody:",
            "document.body.innerText",
            "document.body.textContent",
            "caches.open(",
        ):
            if prohibited in module:
                errors.append(
                    f"prohibited remote or unbounded export marker found: {prohibited}"
                )

        page = read(root, "personal-data.html")
        for marker in (
            'data-release="225"',
            "Personal Data Backup &amp; Restore Centre",
            "Import always requires validation, preview and explicit confirmation",
            "Selected devotional text, published page bodies",
            "No upload, cloud synchronization, analytics",
        ):
            if marker not in page:
                errors.append(f"personal-data page missing marker: {marker}")

        for html in (
            "index.html",
            "platform.html",
            "discovery.html",
            "reading-workspace.html",
            "reading-notes.html",
            "maintenance.html",
        ):
            body = read(root, html)
            if 'data-release="225"' not in body:
                errors.append(f"{html} does not expose data-release 225")
            if "personal-data.html" not in body:
                errors.append(f"{html} does not link to Personal Data Centre")
            if re.search(r'data-release="(222|223|224)"', body):
                errors.append(f"{html} contains stale data-release identity")

        maintenance_module = read(root, "assets/js/maintenance-centre.mjs")
        if "export const RELEASE = 225;" not in maintenance_module:
            errors.append("maintenance module did not advance to 225")

        checks_registry = maintenance.get("checks", [])
        if len(checks_registry) != 8:
            errors.append("maintenance registry must contain eight checks")
        if not any(
            item.get("path") == "/personal-data.html"
            for item in checks_registry
        ):
            errors.append("maintenance registry does not check personal data")

        smoke = read(root, "tools/production_smoke.py")
        for marker in (
            'data-release="225"',
            "const RELEASE = '225';",
            "/personal-data.html",
            "export const RELEASE = 225",
            "personal-data-registry.json",
            "manifest-release-225.json",
            "release-225-production-smoke.json",
        ):
            if marker not in smoke:
                errors.append(f"production smoke missing marker: {marker}")

        for workflow in (
            ".github/workflows/static-site-integrity.yml",
            ".github/workflows/production-smoke.yml",
        ):
            text = read(root, workflow)
            if "225" not in text or "release-225-" not in text:
                errors.append(f"{workflow} has stale release identity")

        if not args.package_mode:
            for relative in (
                "assets/js/reading-list.mjs",
                "assets/js/accessibility-preferences.mjs",
                "assets/js/audio-history.mjs",
                "assets/js/reading-notes.mjs",
                "assets/js/reader-experience.js",
                "tools/site_audit.py",
                "tests/reading-notes.test.mjs",
                "tests/reader-experience.test.mjs",
                "tests/discovery-workspace.test.mjs",
                "tests/knowledge-graph-explorer.test.mjs",
                "tests/audio-history.test.mjs",
                "tests/print-support.test.mjs",
                "tests/accessibility-preferences.test.mjs",
                "tests/reading-list.test.mjs",
                "tests/search-facets.test.mjs",
            ):
                if not (root / relative).is_file():
                    errors.append(f"repository mode requires {relative}")

    report = {
        "release": 225,
        "base_commit": BASE_COMMIT,
        "mode": "package" if args.package_mode else "repository",
        "status": "FAIL" if errors else "PASS",
        "errors": errors,
        "checks": checks,
        "github_actions": "NOT_RUN",
        "deployed_production": "NOT_RUN",
    }
    report_path = (
        args.report if args.report.is_absolute()
        else root / args.report
    )
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
