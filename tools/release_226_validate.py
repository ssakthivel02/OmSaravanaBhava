#!/usr/bin/env python3
"""Validate Release 226 without claiming remote CI or deployment results."""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

RELEASE = "226"
BASE_COMMIT = "2fac2649e2e721e9b4249c6e3651f598bf34191c"
ROUTE = "/personal-library.html"
REQUIRED = [
    "personal-library.html",
    "assets/css/personal-library.css",
    "assets/js/personal-library.mjs",
    "data/personal-library.json",
    "index.html",
    "platform.html",
    "discovery.html",
    "reading-workspace.html",
    "reading-notes.html",
    "personal-data.html",
    "maintenance.html",
    "assets/js/maintenance-centre.mjs",
    "data/maintenance-checks.json",
    "data/site-routes.json",
    "sitemap.xml",
    "service-worker.js",
    "quality/site-audit-config.json",
    "tools/production_smoke.py",
    "tests/test_site_audit.py",
    "tests/personal-library.test.mjs",
    "tests/maintenance-centre.test.mjs",
    ".github/workflows/static-site-integrity.yml",
    ".github/workflows/production-smoke.yml",
    "manifest-release-226.json",
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
        default=Path("artifacts/release-226-validation.json")
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
        manifest = json.loads(read(root, "manifest-release-226.json"))
        library = json.loads(read(root, "data/personal-library.json"))
        routes = json.loads(read(root, "data/site-routes.json"))
        maintenance = json.loads(read(root, "data/maintenance-checks.json"))
        audit = json.loads(read(root, "quality/site-audit-config.json"))
        ET.fromstring(read(root, "sitemap.xml"))

        if manifest.get("release") != 226:
            errors.append("manifest release is not 226")
        if manifest.get("base_commit") != BASE_COMMIT:
            errors.append("manifest base commit does not match Release 225 head")
        if library.get("release") != 226:
            errors.append("personal-library config release is not 226")
        if library.get("builtAgainstCommit") != BASE_COMMIT:
            errors.append("personal-library base commit is incorrect")
        if routes.get("release") != 226:
            errors.append("route directory release is not 226")
        if maintenance.get("release") != 226:
            errors.append("maintenance registry release is not 226")
        if maintenance.get("builtAgainstCommit") != BASE_COMMIT:
            errors.append("maintenance registry base commit is incorrect")

        expected_keys = {
            "readingList": "osb-reading-list-v1",
            "readingProgress": "osb-reading-progress-v1",
            "readingNotes": "osb-reading-notes-v1",
            "accessibility": "osb-accessibility-preferences-v1",
            "audioHistory": "osb-audio-listening-history-v1",
        }
        if library.get("storageKeys") != expected_keys:
            errors.append("personal-library storage keys differ from registered set")
        if library.get("completedThreshold") != 95:
            errors.append("personal-library completion threshold must remain 95")
        if library.get("minimumStartedProgress") != 1:
            errors.append("personal-library minimum started progress must remain 1")

        route_records = routes.get("routes", [])
        route_paths = [
            item.get("path")
            for item in route_records
            if isinstance(item, dict)
        ]
        if route_paths.count(ROUTE) != 1:
            errors.append("personal-library route must appear exactly once")
        if len(route_paths) != len(set(route_paths)):
            errors.append("duplicate route-directory paths detected")
        route = next(
            (item for item in route_records if item.get("path") == ROUTE),
            None
        )
        if route and route.get("status") != "utility":
            errors.append("personal-library route must remain utility")

        if audit.get("expectedRelease") != RELEASE:
            errors.append("site-audit expectedRelease is not 226")
        for relative in (
            "personal-library.html",
            "assets/css/personal-library.css",
            "assets/js/personal-library.mjs",
            "data/personal-library.json",
            "manifest-release-226.json",
        ):
            if relative not in audit.get("requiredFiles", []):
                errors.append(f"site audit does not require {relative}")

        sitemap = read(root, "sitemap.xml")
        if sitemap.count(
            "https://omsaravanabhava.org/personal-library.html"
        ) != 1:
            errors.append("sitemap must contain personal-library route once")

        worker = read(root, "service-worker.js")
        if "const RELEASE = '226';" not in worker:
            errors.append("service-worker identity is not 226")
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
            "/personal-library.html",
            "/assets/css/personal-library.css",
            "/assets/js/personal-library.mjs",
            "/data/personal-library.json",
            "/manifest-release-226.json",
        ):
            if f'"{asset}"' not in optional_text:
                errors.append(f"optional precache missing {asset}")
            if f'"{asset}"' in core_text:
                errors.append(
                    f"personal-library asset incorrectly blocks installation: {asset}"
                )
        if "cacheOptionalAssets" not in worker:
            errors.append("resilient optional caching is missing")

        module = read(root, "assets/js/personal-library.mjs")
        for marker in (
            "export const RELEASE = 226;",
            "readLocalDatasets",
            "normaliseRouteRegistry",
            "buildPersonalLibraryModel",
            "buildActivityEvents",
            "filterActivityEvents",
            "accessibilityLabels",
            "No new browser data was written",
        ):
            if marker not in module:
                errors.append(f"personal-library module missing marker: {marker}")
        for prohibited in (
            ".setItem(",
            ".removeItem(",
            "localStorage.clear(",
            "navigator.sendBeacon",
            "gtag(",
            "google-analytics",
            "api.openai.com",
            "recommendation-api",
            "selectedText:",
            "pageBody:",
            "document.body.innerText",
            "document.body.textContent",
        ):
            if prohibited in module:
                errors.append(
                    f"prohibited write, tracking or source-text marker found: {prohibited}"
                )

        page = read(root, "personal-library.html")
        for marker in (
            'data-release="226"',
            "Personal Library Dashboard",
            "writes no new browser data",
            "actual valid local records",
            "not a recommendation engine",
            "No account, cloud synchronization",
        ):
            if marker not in page:
                errors.append(f"personal-library page missing marker: {marker}")

        for html in (
            "index.html",
            "platform.html",
            "discovery.html",
            "reading-workspace.html",
            "reading-notes.html",
            "personal-data.html",
            "maintenance.html",
        ):
            body = read(root, html)
            if 'data-release="226"' not in body:
                errors.append(f"{html} does not expose data-release 226")
            if "personal-library.html" not in body:
                errors.append(f"{html} does not link to Personal Library")
            if re.search(r'data-release="(222|223|224|225)"', body):
                errors.append(f"{html} contains stale data-release identity")

        maintenance_module = read(root, "assets/js/maintenance-centre.mjs")
        if "export const RELEASE = 226;" not in maintenance_module:
            errors.append("maintenance module did not advance to 226")

        checks_registry = maintenance.get("checks", [])
        if len(checks_registry) != 8:
            errors.append("maintenance registry must contain eight checks")
        if not any(
            item.get("path") == "/personal-library.html"
            for item in checks_registry
        ):
            errors.append("maintenance registry does not check Personal Library")

        smoke = read(root, "tools/production_smoke.py")
        for marker in (
            'data-release="226"',
            "const RELEASE = '226';",
            "/personal-library.html",
            "export const RELEASE = 226",
            "personal-library.json",
            "manifest-release-226.json",
            "release-226-production-smoke.json",
        ):
            if marker not in smoke:
                errors.append(f"production smoke missing marker: {marker}")

        for workflow in (
            ".github/workflows/static-site-integrity.yml",
            ".github/workflows/production-smoke.yml",
        ):
            text = read(root, workflow)
            if "226" not in text or "release-226-" not in text:
                errors.append(f"{workflow} has stale release identity")

        if not args.package_mode:
            for relative in (
                "assets/js/personal-data.mjs",
                "assets/js/reading-notes.mjs",
                "assets/js/reader-experience.js",
                "assets/js/reading-list.mjs",
                "assets/js/accessibility-preferences.mjs",
                "assets/js/audio-history.mjs",
                "tools/site_audit.py",
                "tests/personal-data.test.mjs",
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
        "release": 226,
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
