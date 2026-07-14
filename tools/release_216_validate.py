#!/usr/bin/env python3
"""Validate the Release 216 overlay without claiming GitHub or deployment results."""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

RELEASE = "216"
BASE_COMMIT = "61875883f928169df44143f9d8582ece43128138"
ROUTE = "/reading-list.html"
REQUIRED_OVERLAY = [
    "reading-list.html",
    "assets/css/reading-list.css",
    "assets/js/reading-list.mjs",
    "search-facets.html",
    "assets/css/search-facets.css",
    "assets/js/search-facets.mjs",
    "index.html",
    "platform.html",
    "data/site-routes.json",
    "sitemap.xml",
    "service-worker.js",
    "quality/site-audit-config.json",
    "tools/production_smoke.py",
    "tests/test_site_audit.py",
    "tests/search-facets.test.mjs",
    "tests/reading-list.test.mjs",
    ".github/workflows/static-site-integrity.yml",
    ".github/workflows/production-smoke.yml",
    "manifest-release-216.json",
]

def read(root: Path, relative: str) -> str:
    return (root / relative).read_text(encoding="utf-8")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--package-mode", action="store_true")
    parser.add_argument("--report", type=Path, default=Path("artifacts/release-216-validation.json"))
    args = parser.parse_args()
    root = args.root.resolve()
    errors: list[str] = []
    checks: list[str] = []

    for relative in REQUIRED_OVERLAY:
        if not (root / relative).is_file():
            errors.append(f"missing required overlay file: {relative}")
        else:
            checks.append(f"exists: {relative}")

    if not errors:
        manifest = json.loads(read(root, "manifest-release-216.json"))
        routes = json.loads(read(root, "data/site-routes.json"))
        config = json.loads(read(root, "quality/site-audit-config.json"))
        ET.fromstring(read(root, "sitemap.xml"))

        if manifest.get("release") != 216:
            errors.append("manifest release is not 216")
        if manifest.get("base_commit") != BASE_COMMIT:
            errors.append("manifest base commit does not match Release 215 head")
        if routes.get("release") != 216:
            errors.append("route directory release is not 216")

        route_records = routes.get("routes", [])
        route_paths = [item.get("path") for item in route_records if isinstance(item, dict)]
        if route_paths.count(ROUTE) != 1:
            errors.append("reading-list route must appear exactly once in route directory")
        if len(route_paths) != len(set(route_paths)):
            errors.append("duplicate route-directory paths detected")
        reading_record = next((item for item in route_records if item.get("path") == ROUTE), None)
        if reading_record and reading_record.get("status") != "utility":
            errors.append("reading-list route must retain utility status")

        if config.get("expectedRelease") != RELEASE:
            errors.append("site audit expectedRelease is not 216")
        for relative in ("reading-list.html", "assets/css/reading-list.css", "assets/js/reading-list.mjs"):
            if relative not in config.get("requiredFiles", []):
                errors.append(f"site audit does not require {relative}")

        sitemap = read(root, "sitemap.xml")
        if sitemap.count("https://omsaravanabhava.org/reading-list.html") != 1:
            errors.append("sitemap must contain exactly one reading-list URL")

        worker = read(root, "service-worker.js")
        if "const RELEASE = '216';" not in worker:
            errors.append("service-worker identity is not 216")
        if "const USER_READING_CACHE = 'osb-user-reading-v1';" not in worker:
            errors.append("persistent user reading cache identity is missing")
        if "DATA_CACHE, USER_READING_CACHE" not in worker:
            errors.append("service-worker activation does not preserve the user reading cache")
        core_match = re.search(r"const CORE_PRECACHE_URLS = \[(.*?)\];", worker, re.S)
        optional_match = re.search(r"const PRECACHE_URLS = \[(.*?)\];", worker, re.S)
        new_assets = {
            "/reading-list.html",
            "/assets/css/reading-list.css",
            "/assets/js/reading-list.mjs",
        }
        core_text = core_match.group(1) if core_match else ""
        optional_text = optional_match.group(1) if optional_match else ""
        for asset in new_assets:
            if f'"{asset}"' not in optional_text:
                errors.append(f"optional cache is missing {asset}")
            if f'"{asset}"' in core_text:
                errors.append(f"reading-list asset incorrectly blocks installation: {asset}")
        if "cacheOptionalAssets" not in worker or "CORE_PRECACHE_URLS" not in worker:
            errors.append("resilient service-worker strategy is missing")

        for html in ("index.html", "platform.html", "search-facets.html", "reading-list.html"):
            body = read(root, html)
            if 'data-release="216"' not in body:
                errors.append(f"{html} does not expose data-release 216")
            if "reading-list.html" not in body:
                errors.append(f"{html} does not link to reading list")

        module = read(root, "assets/js/reading-list.mjs")
        for marker in (
            "export const RELEASE = 216;",
            "osb-reading-list-v1",
            "osb-user-reading-v1",
            "cacheSavedRoutes",
            "localStorage",
        ):
            if marker not in module:
                errors.append(f"reading-list module is missing marker: {marker}")
        for prohibited in ("navigator.sendBeacon", "gtag(", "google-analytics", "api.openai.com"):
            if prohibited in module:
                errors.append(f"prohibited remote marker found: {prohibited}")

        facets = read(root, "assets/js/search-facets.mjs")
        for marker in (
            "export const RELEASE = 216;",
            "saveReadingRecord",
            "Save to reading list",
        ):
            if marker not in facets:
                errors.append(f"search facets reading-list integration is missing: {marker}")

        smoke = read(root, "tools/production_smoke.py")
        for marker in (
            'data-release="216"',
            "const RELEASE = '216';",
            "/reading-list.html",
            "/assets/js/reading-list.mjs",
        ):
            if marker not in smoke:
                errors.append(f"production smoke is missing marker: {marker}")

        for workflow in (
            ".github/workflows/static-site-integrity.yml",
            ".github/workflows/production-smoke.yml",
        ):
            body = read(root, workflow)
            if "216" not in body or "release-216-" not in body:
                errors.append(f"{workflow} has stale release or artifact identity")

        if not args.package_mode:
            for relative in (
                "data/search-index.json",
                "assets/css/osb44.css",
                "tools/site_audit.py",
            ):
                if not (root / relative).is_file():
                    errors.append(f"repository mode requires {relative}")

    report = {
        "release": 216,
        "base_commit": BASE_COMMIT,
        "mode": "package" if args.package_mode else "repository",
        "status": "FAIL" if errors else "PASS",
        "errors": errors,
        "checks": checks,
        "github_actions": "NOT_RUN",
        "deployed_production": "NOT_RUN",
    }

    report_path = args.report if args.report.is_absolute() else root / args.report
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if report["status"] == "FAIL" else 0

if __name__ == "__main__":
    sys.exit(main())
