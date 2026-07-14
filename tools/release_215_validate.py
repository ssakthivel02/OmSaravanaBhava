#!/usr/bin/env python3
"""Validate the Release 215 overlay without claiming GitHub or production results."""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlsplit

RELEASE = "215"
BASE_COMMIT = "17bd5228f38f6520e8c496fc9cd3924f562de6e2"
ROUTE = "/search-facets.html"
ALLOWED_SEARCH_STATUSES = {
    "published",
    "published-source-linked",
    "partial-reviewed",
    "reviewed-opening-extract",
    "source-register",
    "source-linked-sections-available",
}
REQUIRED_OVERLAY = [
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
    ".github/workflows/static-site-integrity.yml",
    ".github/workflows/production-smoke.yml",
    "manifest-release-215.json",
]


def read(root: Path, relative: str) -> str:
    return (root / relative).read_text(encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--package-mode", action="store_true")
    parser.add_argument("--report", type=Path, default=Path("artifacts/release-215-validation.json"))
    args = parser.parse_args()
    root = args.root.resolve()
    errors: list[str] = []
    checks: list[str] = []

    for relative in REQUIRED_OVERLAY:
        if not (root / relative).is_file():
            errors.append(f"missing required overlay file: {relative}")
        else:
            checks.append(f"exists: {relative}")

    if errors:
        report = {"release": 215, "status": "FAIL", "errors": errors, "checks": checks}
    else:
        manifest = json.loads(read(root, "manifest-release-215.json"))
        routes = json.loads(read(root, "data/site-routes.json"))
        config = json.loads(read(root, "quality/site-audit-config.json"))
        ET.fromstring(read(root, "sitemap.xml"))

        if manifest.get("release") != 215:
            errors.append("manifest release is not 215")
        if manifest.get("base_commit") != BASE_COMMIT:
            errors.append("manifest base commit does not match Release 214 head")
        if routes.get("release") != 215:
            errors.append("route directory release is not 215")
        route_records = routes.get("routes", [])
        route_paths = [item.get("path") for item in route_records if isinstance(item, dict)]
        if route_paths.count(ROUTE) != 1:
            errors.append("search facets route must appear exactly once in route directory")
        if len(route_paths) != len(set(route_paths)):
            errors.append("duplicate route-directory paths detected")
        if config.get("expectedRelease") != RELEASE:
            errors.append("site audit expectedRelease is not 215")
        for relative in ("search-facets.html", "assets/css/search-facets.css", "assets/js/search-facets.mjs"):
            if relative not in config.get("requiredFiles", []):
                errors.append(f"site audit does not require {relative}")

        sitemap = read(root, "sitemap.xml")
        if sitemap.count("https://omsaravanabhava.org/search-facets.html") != 1:
            errors.append("sitemap must contain exactly one search-facets URL")

        worker = read(root, "service-worker.js")
        if "const RELEASE = '215';" not in worker:
            errors.append("service worker release identity is not 215")
        core_match = re.search(r"const CORE_PRECACHE_URLS = \[(.*?)\];", worker, re.S)
        optional_match = re.search(r"const PRECACHE_URLS = \[(.*?)\];", worker, re.S)
        new_assets = {
            "/search-facets.html",
            "/assets/css/search-facets.css",
            "/assets/js/search-facets.mjs",
        }
        core_text = core_match.group(1) if core_match else ""
        optional_text = optional_match.group(1) if optional_match else ""
        for asset in new_assets:
            if f'"{asset}"' not in optional_text:
                errors.append(f"optional cache is missing {asset}")
            if f'"{asset}"' in core_text:
                errors.append(f"new optional asset incorrectly blocks install: {asset}")
        if "cacheOptionalAssets" not in worker or "CORE_PRECACHE_URLS" not in worker:
            errors.append("resilient service-worker strategy is missing")

        for html in ("index.html", "platform.html", "search-facets.html"):
            body = read(root, html)
            if 'data-release="215"' not in body:
                errors.append(f"{html} does not expose data-release 215")
            if "search-facets.html" not in body:
                errors.append(f"{html} does not link to search facets")

        module = read(root, "assets/js/search-facets.mjs")
        if "export const RELEASE = 215;" not in module:
            errors.append("search facets module release identity is not 215")
        for prohibited in ("navigator.sendBeacon", "gtag(", "google-analytics", "api.openai.com"):
            if prohibited in module:
                errors.append(f"prohibited remote analytics or AI marker found: {prohibited}")
        for status in ALLOWED_SEARCH_STATUSES:
            if status not in module:
                errors.append(f"published-status policy is missing {status}")

        smoke = read(root, "tools/production_smoke.py")
        for marker in (
            'data-release="215"',
            "const RELEASE = '215';",
            "/search-facets.html",
            "/assets/js/search-facets.mjs",
        ):
            if marker not in smoke:
                errors.append(f"production smoke is missing marker: {marker}")

        for workflow in (
            ".github/workflows/static-site-integrity.yml",
            ".github/workflows/production-smoke.yml",
        ):
            body = read(root, workflow)
            if "215" not in body or "release-215-" not in body:
                errors.append(f"{workflow} has stale release or artifact identity")

        if not args.package_mode:
            index_path = root / "data/search-index.json"
            if not index_path.is_file():
                errors.append("repository mode requires data/search-index.json")
            else:
                records = json.loads(index_path.read_text(encoding="utf-8"))
                public_paths = set(route_paths)
                included = []
                for record in records if isinstance(records, list) else []:
                    if not isinstance(record, dict):
                        continue
                    status = str(record.get("status", "")).strip().lower()
                    tags = {str(tag).strip().lower() for tag in record.get("tags", []) if isinstance(tag, str)}
                    raw_route = str(record.get("route", "")).strip()
                    path = urlsplit("/" + raw_route.lstrip("/")).path
                    if status in ALLOWED_SEARCH_STATUSES and "not-published" not in tags and path in public_paths:
                        included.append(record)
                if not included:
                    errors.append("no published search records survive Release 215 policy")
                if any(str(item.get("status", "")).lower() == "draft" for item in included):
                    errors.append("draft search record survived publication filtering")
                checks.append(f"repository published search records: {len(included)}")

        report = {
            "release": 215,
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
