#!/usr/bin/env python3
"""Validate Release 223 without claiming remote CI or deployment results."""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

RELEASE = "223"
BASE_COMMIT = "131e51863ef4f1512b77a32025b249f45ee9834a"
ROUTE = "/reading-workspace.html"
REQUIRED = [
    "reading-workspace.html",
    "assets/css/reading-workspace.css",
    "assets/js/reader-experience.js",
    "data/reading-workspace.json",
    "assets/js/pwa-register.js",
    "index.html",
    "platform.html",
    "discovery.html",
    "maintenance.html",
    "assets/js/maintenance-centre.mjs",
    "data/maintenance-checks.json",
    "data/site-routes.json",
    "sitemap.xml",
    "service-worker.js",
    "quality/site-audit-config.json",
    "tools/production_smoke.py",
    "tests/test_site_audit.py",
    "tests/reader-experience.test.mjs",
    "tests/maintenance-centre.test.mjs",
    ".github/workflows/static-site-integrity.yml",
    ".github/workflows/production-smoke.yml",
    "manifest-release-223.json",
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
        default=Path("artifacts/release-223-validation.json")
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
        manifest = json.loads(
            read(root, "manifest-release-223.json")
        )
        reading = json.loads(
            read(root, "data/reading-workspace.json")
        )
        routes = json.loads(
            read(root, "data/site-routes.json")
        )
        maintenance = json.loads(
            read(root, "data/maintenance-checks.json")
        )
        config = json.loads(
            read(root, "quality/site-audit-config.json")
        )
        ET.fromstring(read(root, "sitemap.xml"))

        if manifest.get("release") != 223:
            errors.append("manifest release is not 223")
        if manifest.get("base_commit") != BASE_COMMIT:
            errors.append(
                "manifest base commit does not match Release 222 head"
            )
        if reading.get("release") != 223:
            errors.append("reading workspace config release is not 223")
        if reading.get("builtAgainstCommit") != BASE_COMMIT:
            errors.append("reading workspace base commit is incorrect")
        if routes.get("release") != 223:
            errors.append("route directory release is not 223")
        if maintenance.get("release") != 223:
            errors.append("maintenance registry release is not 223")
        if maintenance.get("builtAgainstCommit") != BASE_COMMIT:
            errors.append("maintenance registry base commit is incorrect")

        if reading.get("storageKey") != "osb-reading-progress-v1":
            errors.append("reading progress storage key changed unexpectedly")
        if reading.get("maximumProgressItems") != 50:
            errors.append("maximum reading progress items must remain 50")
        if reading.get("completedThreshold") != 95:
            errors.append("completed threshold must remain 95")
        if not {
            "osb-reading-list-v1",
            "osb-accessibility-preferences-v1",
            "osb-audio-listening-history-v1",
        }.issubset(set(reading.get("protectedStorageKeys", []))):
            errors.append("protected browser storage keys are incomplete")

        route_records = routes.get("routes", [])
        route_paths = [
            item.get("path")
            for item in route_records
            if isinstance(item, dict)
        ]
        if route_paths.count(ROUTE) != 1:
            errors.append("reading workspace route must appear exactly once")
        if len(route_paths) != len(set(route_paths)):
            errors.append("duplicate route directory paths detected")
        route = next(
            (
                item for item in route_records
                if item.get("path") == ROUTE
            ),
            None
        )
        if route and route.get("status") != "utility":
            errors.append("reading workspace route must remain utility")

        if config.get("expectedRelease") != RELEASE:
            errors.append("site audit expectedRelease is not 223")
        for relative in (
            "reading-workspace.html",
            "assets/css/reading-workspace.css",
            "assets/js/reader-experience.js",
            "data/reading-workspace.json",
            "manifest-release-223.json",
        ):
            if relative not in config.get("requiredFiles", []):
                errors.append(f"site audit does not require {relative}")

        sitemap = read(root, "sitemap.xml")
        if sitemap.count(
            "https://omsaravanabhava.org/reading-workspace.html"
        ) != 1:
            errors.append("sitemap must contain reading workspace once")

        worker = read(root, "service-worker.js")
        if "const RELEASE = '223';" not in worker:
            errors.append("service-worker identity is not 223")
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
            "/reading-workspace.html",
            "/assets/css/reading-workspace.css",
            "/assets/js/reader-experience.js",
            "/data/reading-workspace.json",
            "/manifest-release-223.json",
        ):
            if f'"{asset}"' not in optional_text:
                errors.append(f"optional precache missing {asset}")
            if f'"{asset}"' in core_text:
                errors.append(
                    f"reading asset incorrectly blocks installation: {asset}"
                )
        if "cacheOptionalAssets" not in worker:
            errors.append("resilient optional caching is missing")

        bootstrap = read(root, "assets/js/pwa-register.js")
        if "reader-experience.js" not in bootstrap:
            errors.append("shared bootstrap does not load reader experience")

        module = read(root, "assets/js/reader-experience.js")
        for marker in (
            "export const RELEASE = 223;",
            "osb-reading-progress-v1",
            "calculateProgress",
            "progressToScrollY",
            "routeIsEligible",
            "filterWorkspaceRoutes",
            "buildWorkspaceMetrics",
            "reading-list.mjs",
            "osb-reader-focus",
        ):
            if marker not in module:
                errors.append(f"reader module missing marker: {marker}")
        for prohibited in (
            "navigator.sendBeacon",
            "gtag(",
            "google-analytics",
            "api.openai.com",
            "localStorage.clear(",
            "textContent: record.content",
            "content: document.body",
        ):
            if prohibited in module:
                errors.append(
                    f"prohibited remote or content-storage marker found: {prohibited}"
                )

        page = read(root, "reading-workspace.html")
        for marker in (
            'data-release="223"',
            "Premium Reading Workspace",
            "No devotional text is copied",
            "not proof that a work has been read",
            "No account, analytics or cross-device synchronization",
        ):
            if marker not in page:
                errors.append(
                    f"reading workspace page missing marker: {marker}"
                )

        for html in (
            "index.html",
            "platform.html",
            "discovery.html",
            "maintenance.html",
        ):
            body = read(root, html)
            if 'data-release="223"' not in body:
                errors.append(f"{html} does not expose data-release 223")
            if "reading-workspace.html" not in body:
                errors.append(f"{html} does not link to reading workspace")

        maintenance_module = read(
            root,
            "assets/js/maintenance-centre.mjs"
        )
        if "export const RELEASE = 223;" not in maintenance_module:
            errors.append("maintenance module did not advance to 223")

        checks_registry = maintenance.get("checks", [])
        if len(checks_registry) != 8:
            errors.append("maintenance registry must contain eight checks")
        if not any(
            item.get("path") == "/reading-workspace.html"
            for item in checks_registry
        ):
            errors.append(
                "maintenance registry does not check reading workspace"
            )

        smoke = read(root, "tools/production_smoke.py")
        for marker in (
            'data-release="223"',
            "const RELEASE = '223';",
            "/reading-workspace.html",
            "export const RELEASE = 223",
            "reader-experience.js",
            "reading-workspace.json",
            "manifest-release-223.json",
            "release-223-production-smoke.json",
        ):
            if marker not in smoke:
                errors.append(f"production smoke missing marker: {marker}")

        for workflow in (
            ".github/workflows/static-site-integrity.yml",
            ".github/workflows/production-smoke.yml",
        ):
            text = read(root, workflow)
            if "223" not in text or "release-223-" not in text:
                errors.append(f"{workflow} has stale release identity")

        if not args.package_mode:
            for relative in (
                "assets/js/reading-list.mjs",
                "reading-list.html",
                "print-pdf.html",
                "accessibility.html",
                "data/navigation-sections.json",
                "tools/site_audit.py",
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
        "release": 223,
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
