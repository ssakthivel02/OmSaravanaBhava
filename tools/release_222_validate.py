#!/usr/bin/env python3
"""Validate Release 222 without claiming remote CI or deployment results."""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

RELEASE = "222"
BASE_COMMIT = "99d62afcdd8ea5ccc8dd9170b98f9d0e4942e8f4"
ROUTE = "/discovery.html"
REQUIRED = [
    "discovery.html",
    "assets/css/discovery-workspace.css",
    "assets/js/discovery-workspace.mjs",
    "data/discovery-lenses.json",
    "index.html",
    "platform.html",
    "maintenance.html",
    "assets/js/maintenance-centre.mjs",
    "data/maintenance-checks.json",
    "data/site-routes.json",
    "sitemap.xml",
    "service-worker.js",
    "quality/site-audit-config.json",
    "tools/production_smoke.py",
    "tests/test_site_audit.py",
    "tests/discovery-workspace.test.mjs",
    "tests/maintenance-centre.test.mjs",
    ".github/workflows/static-site-integrity.yml",
    ".github/workflows/production-smoke.yml",
    "manifest-release-222.json",
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
        default=Path("artifacts/release-222-validation.json")
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
            read(root, "manifest-release-222.json")
        )
        lenses = json.loads(
            read(root, "data/discovery-lenses.json")
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

        if manifest.get("release") != 222:
            errors.append("manifest release is not 222")
        if manifest.get("base_commit") != BASE_COMMIT:
            errors.append(
                "manifest base commit does not match Release 221 head"
            )
        if lenses.get("release") != 222:
            errors.append("discovery-lenses release is not 222")
        if routes.get("release") != 222:
            errors.append("route-directory release is not 222")
        if maintenance.get("release") != 222:
            errors.append("maintenance registry release is not 222")
        if maintenance.get("builtAgainstCommit") != BASE_COMMIT:
            errors.append(
                "maintenance registry base commit is incorrect"
            )

        lens_records = lenses.get("lenses", [])
        lens_ids = [
            item.get("id")
            for item in lens_records
            if isinstance(item, dict)
        ]
        if len(lens_ids) != len(set(lens_ids)):
            errors.append("duplicate discovery lens ids")
        if len(lens_records) != 9:
            errors.append("expected nine discovery lenses")
        if "all" not in lens_ids:
            errors.append("all-routes discovery lens is missing")

        excluded = set(lenses.get("excludedStatuses", []))
        if not {
            "draft",
            "private",
            "unpublished",
            "archived",
        }.issubset(excluded):
            errors.append(
                "discovery configuration does not exclude all private states"
            )

        route_records = routes.get("routes", [])
        route_paths = [
            item.get("path")
            for item in route_records
            if isinstance(item, dict)
        ]
        if route_paths.count(ROUTE) != 1:
            errors.append(
                "discovery route must appear exactly once"
            )
        if len(route_paths) != len(set(route_paths)):
            errors.append("duplicate route-directory paths detected")
        route = next(
            (
                item
                for item in route_records
                if item.get("path") == ROUTE
            ),
            None
        )
        if route and route.get("status") != "navigation":
            errors.append(
                "discovery route status must remain navigation"
            )

        if config.get("expectedRelease") != RELEASE:
            errors.append(
                "site-audit expectedRelease is not 222"
            )
        for relative in (
            "discovery.html",
            "assets/css/discovery-workspace.css",
            "assets/js/discovery-workspace.mjs",
            "data/discovery-lenses.json",
            "manifest-release-222.json",
        ):
            if relative not in config.get("requiredFiles", []):
                errors.append(
                    f"site audit does not require {relative}"
                )

        sitemap = read(root, "sitemap.xml")
        if sitemap.count(
            "https://omsaravanabhava.org/discovery.html"
        ) != 1:
            errors.append(
                "sitemap must contain discovery route exactly once"
            )

        worker = read(root, "service-worker.js")
        if "const RELEASE = '222';" not in worker:
            errors.append(
                "service-worker identity is not 222"
            )
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
            "/discovery.html",
            "/assets/css/discovery-workspace.css",
            "/assets/js/discovery-workspace.mjs",
            "/data/discovery-lenses.json",
            "/manifest-release-222.json",
        ):
            if f'"{asset}"' not in optional_text:
                errors.append(
                    f"optional precache missing {asset}"
                )
            if f'"{asset}"' in core_text:
                errors.append(
                    f"discovery asset incorrectly blocks installation: {asset}"
                )
        if "cacheOptionalAssets" not in worker:
            errors.append(
                "resilient optional caching is missing"
            )

        module = read(
            root,
            "assets/js/discovery-workspace.mjs"
        )
        for marker in (
            "export const RELEASE = 222;",
            "normaliseDiscoveryModel",
            "filterDiscoveryItems",
            "buildDiscoveryMetrics",
            "lensRouteCounts",
            "data/navigation-sections.json",
            "data/site-routes.json",
        ):
            if marker not in module:
                errors.append(
                    f"discovery module missing marker: {marker}"
                )
        for prohibited in (
            "api.openai.com",
            "navigator.sendBeacon",
            "gtag(",
            "google-analytics",
            "recommendation-api",
            "Math.random(",
        ):
            if prohibited in module:
                errors.append(
                    f"prohibited remote or nondeterministic marker found: {prohibited}"
                )

        page = read(root, "discovery.html")
        for marker in (
            'data-release="222"',
            "Discovery Workspace",
            "Counts are runtime calculations",
            "it is not personalised AI",
            "No remote analytics",
        ):
            if marker not in page:
                errors.append(
                    f"discovery page missing boundary marker: {marker}"
                )

        for html in (
            "index.html",
            "platform.html",
            "maintenance.html",
        ):
            body = read(root, html)
            if 'data-release="222"' not in body:
                errors.append(
                    f"{html} does not expose data-release 222"
                )
            if "discovery.html" not in body:
                errors.append(
                    f"{html} does not link to Discovery Workspace"
                )

        if "homeDiscoveryLenses" not in read(root, "index.html"):
            errors.append(
                "homepage discovery composition host is missing"
            )

        maintenance_module = read(
            root,
            "assets/js/maintenance-centre.mjs"
        )
        if "export const RELEASE = 222;" not in maintenance_module:
            errors.append(
                "maintenance module did not advance to 222"
            )

        checks_registry = maintenance.get("checks", [])
        if len(checks_registry) != 8:
            errors.append(
                "maintenance registry must contain eight checks"
            )
        if not any(
            item.get("path") == "/discovery.html"
            for item in checks_registry
        ):
            errors.append(
                "maintenance registry does not check discovery page"
            )

        smoke = read(root, "tools/production_smoke.py")
        for marker in (
            'data-release="222"',
            "const RELEASE = '222';",
            "/discovery.html",
            "export const RELEASE = 222",
            "discovery-lenses.json",
            "manifest-release-222.json",
            "release-222-production-smoke.json",
        ):
            if marker not in smoke:
                errors.append(
                    f"production smoke missing marker: {marker}"
                )

        for workflow in (
            ".github/workflows/static-site-integrity.yml",
            ".github/workflows/production-smoke.yml",
        ):
            text = read(root, workflow)
            if "222" not in text or "release-222-" not in text:
                errors.append(
                    f"{workflow} has stale release identity"
                )

        if not args.package_mode:
            for relative in (
                "data/navigation-sections.json",
                "explore.html",
                "assets/js/explore-navigation.js",
                "tools/site_audit.py",
                "tests/knowledge-graph-explorer.test.mjs",
                "tests/audio-history.test.mjs",
                "tests/print-support.test.mjs",
                "tests/accessibility-preferences.test.mjs",
                "tests/reading-list.test.mjs",
                "tests/search-facets.test.mjs",
            ):
                if not (root / relative).is_file():
                    errors.append(
                        f"repository mode requires {relative}"
                    )

    report = {
        "release": 222,
        "base_commit": BASE_COMMIT,
        "mode": "package" if args.package_mode else "repository",
        "status": "FAIL" if errors else "PASS",
        "errors": errors,
        "checks": checks,
        "github_actions": "NOT_RUN",
        "deployed_production": "NOT_RUN",
    }
    report_path = (
        args.report
        if args.report.is_absolute()
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
