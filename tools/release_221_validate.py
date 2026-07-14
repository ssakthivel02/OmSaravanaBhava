#!/usr/bin/env python3
"""Validate Release 221 without claiming GitHub Actions or production results."""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

RELEASE = "221"
BASE_COMMIT = "a3bebc4f28059e0147d9ddcb8cfa3372b36b2ebb"
ROUTE = "/maintenance.html"
REQUIRED = [
    "maintenance.html",
    "assets/css/maintenance-centre.css",
    "assets/js/maintenance-centre.mjs",
    "data/maintenance-checks.json",
    "index.html",
    "platform.html",
    "data/site-routes.json",
    "sitemap.xml",
    "service-worker.js",
    "quality/site-audit-config.json",
    "tools/production_smoke.py",
    "tests/test_site_audit.py",
    "tests/maintenance-centre.test.mjs",
    ".github/workflows/static-site-integrity.yml",
    ".github/workflows/production-smoke.yml",
    "manifest-release-221.json",
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
        default=Path("artifacts/release-221-validation.json")
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
            read(root, "manifest-release-221.json")
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

        if manifest.get("release") != 221:
            errors.append("manifest release is not 221")
        if manifest.get("base_commit") != BASE_COMMIT:
            errors.append(
                "manifest base commit does not match corrected Release 220 head"
            )
        if routes.get("release") != 221:
            errors.append("route directory release is not 221")
        if maintenance.get("release") != 221:
            errors.append("maintenance registry release is not 221")
        if maintenance.get("builtAgainstCommit") != BASE_COMMIT:
            errors.append(
                "maintenance registry base commit is incorrect"
            )

        route_records = routes.get("routes", [])
        route_paths = [
            item.get("path")
            for item in route_records
            if isinstance(item, dict)
        ]
        if route_paths.count(ROUTE) != 1:
            errors.append(
                "maintenance route must appear exactly once"
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
        if route and route.get("status") != "utility":
            errors.append(
                "maintenance route status must remain utility"
            )

        if config.get("expectedRelease") != RELEASE:
            errors.append(
                "site audit expectedRelease is not 221"
            )
        for relative in (
            "maintenance.html",
            "assets/css/maintenance-centre.css",
            "assets/js/maintenance-centre.mjs",
            "data/maintenance-checks.json",
            "manifest-release-221.json",
        ):
            if relative not in config.get("requiredFiles", []):
                errors.append(
                    f"site audit does not require {relative}"
                )

        sitemap = read(root, "sitemap.xml")
        if sitemap.count(
            "https://omsaravanabhava.org/maintenance.html"
        ) != 1:
            errors.append(
                "sitemap must contain maintenance route exactly once"
            )

        worker = read(root, "service-worker.js")
        if "const RELEASE = '221';" not in worker:
            errors.append(
                "service-worker identity is not 221"
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
            "/maintenance.html",
            "/assets/css/maintenance-centre.css",
            "/assets/js/maintenance-centre.mjs",
            "/data/maintenance-checks.json",
            "/manifest-release-221.json",
        ):
            if f'"{asset}"' not in optional_text:
                errors.append(
                    f"optional precache missing {asset}"
                )
            if f'"{asset}"' in core_text:
                errors.append(
                    f"maintenance asset incorrectly blocks installation: {asset}"
                )
        if "cacheOptionalAssets" not in worker:
            errors.append(
                "resilient optional caching is missing"
            )

        checks_registry = maintenance.get("checks", [])
        if len(checks_registry) != 8:
            errors.append(
                "maintenance registry must contain eight bounded checks"
            )
        check_ids = [
            item.get("id")
            for item in checks_registry
            if isinstance(item, dict)
        ]
        if len(check_ids) != len(set(check_ids)):
            errors.append(
                "maintenance registry contains duplicate check ids"
            )
        for check in checks_registry:
            path = check.get("path")
            if not isinstance(path, str) or not path.startswith("/"):
                errors.append(
                    f"maintenance check has invalid path: {check.get('id')}"
                )
        protected = set(
            maintenance.get("protectedBrowserState", [])
        )
        expected_protected = {
            "osb-user-reading-v1",
            "osb-reading-list-v1",
            "osb-accessibility-preferences-v1",
            "osb-audio-listening-history-v1",
        }
        if not expected_protected.issubset(protected):
            errors.append(
                "maintenance registry does not preserve all user-state keys"
            )

        module = read(
            root,
            "assets/js/maintenance-centre.mjs"
        )
        for marker in (
            "export const RELEASE = 221;",
            "runResourceCheck",
            "auditPaths",
            "clearTransientCaches",
            "requestServiceWorkerUpdate",
            "buildBrowserSnapshot",
            "osb-runtime-v",
            "osb-data-v",
        ):
            if marker not in module:
                errors.append(
                    f"maintenance module missing marker: {marker}"
                )
        for prohibited in (
            "navigator.sendBeacon",
            "gtag(",
            "google-analytics",
            "api.openai.com",
            "localStorage.clear(",
            "caches.keys().then(names => Promise.all(names.map",
        ):
            if prohibited in module:
                errors.append(
                    f"prohibited destructive or remote marker found: {prohibited}"
                )
        if "osb-static-v" in re.search(
            r"DEFAULT_TRANSIENT_CACHE_PREFIXES.*?\];",
            module,
            re.S
        ).group(0):
            errors.append(
                "static shell cache must not be a transient cleanup prefix"
            )

        page = read(root, "maintenance.html")
        for marker in (
            'data-release="221"',
            "Maintenance Centre",
            "cannot prove that GitHub Actions passed",
            "preserves reading lists",
            "No production certification is claimed",
        ):
            if marker not in page:
                errors.append(
                    f"maintenance page missing boundary marker: {marker}"
                )

        for html in ("index.html", "platform.html"):
            body = read(root, html)
            if 'data-release="221"' not in body:
                errors.append(
                    f"{html} does not expose data-release 221"
                )
            if "maintenance.html" not in body:
                errors.append(
                    f"{html} does not link to Maintenance Centre"
                )

        smoke = read(root, "tools/production_smoke.py")
        for marker in (
            'data-release="221"',
            "const RELEASE = '221';",
            "/maintenance.html",
            "export const RELEASE = 221",
            "maintenance-checks.json",
            "manifest-release-221.json",
            "release-221-production-smoke.json",
        ):
            if marker not in smoke:
                errors.append(
                    f"production smoke missing marker: {marker}"
                )

        for workflow in (
            ".github/workflows/static-site-integrity.yml",
            ".github/workflows/production-smoke.yml",
        ):
            body = read(root, workflow)
            if "221" not in body or "release-221-" not in body:
                errors.append(
                    f"{workflow} has stale release identity"
                )

        if not args.package_mode:
            for relative in (
                "knowledge-graph-explorer.html",
                "assets/js/knowledge-graph-explorer.mjs",
                "data/knowledge-graph-explorer.json",
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
        "release": 221,
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
