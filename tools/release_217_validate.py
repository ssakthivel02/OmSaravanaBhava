#!/usr/bin/env python3
"""Validate Release 217 without claiming GitHub Actions or production results."""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

RELEASE = "217"
BASE_COMMIT = "6d5df24f611e0f8164834544a9e92521e4cf5c27"
ROUTE = "/accessibility.html"
REQUIRED = [
    "accessibility.html",
    "assets/css/accessibility-preferences.css",
    "assets/js/accessibility-preferences.mjs",
    "assets/js/pwa-register.js",
    "index.html",
    "platform.html",
    "data/site-routes.json",
    "sitemap.xml",
    "service-worker.js",
    "quality/site-audit-config.json",
    "tools/production_smoke.py",
    "tests/test_site_audit.py",
    "tests/accessibility-preferences.test.mjs",
    ".github/workflows/static-site-integrity.yml",
    ".github/workflows/production-smoke.yml",
    "manifest-release-217.json",
]

def read(root: Path, relative: str) -> str:
    return (root / relative).read_text(encoding="utf-8")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--package-mode", action="store_true")
    parser.add_argument("--report", type=Path, default=Path("artifacts/release-217-validation.json"))
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
        manifest = json.loads(read(root, "manifest-release-217.json"))
        routes = json.loads(read(root, "data/site-routes.json"))
        config = json.loads(read(root, "quality/site-audit-config.json"))
        ET.fromstring(read(root, "sitemap.xml"))

        if manifest.get("release") != 217:
            errors.append("manifest release is not 217")
        if manifest.get("base_commit") != BASE_COMMIT:
            errors.append("manifest base commit does not match Release 216 head")
        if routes.get("release") != 217:
            errors.append("route directory release is not 217")
        paths = [item.get("path") for item in routes.get("routes", []) if isinstance(item, dict)]
        if paths.count(ROUTE) != 1:
            errors.append("accessibility route must appear exactly once")
        if len(paths) != len(set(paths)):
            errors.append("duplicate route directory paths detected")
        route = next((item for item in routes.get("routes", []) if item.get("path") == ROUTE), None)
        if route and route.get("status") != "utility":
            errors.append("accessibility route status must remain utility")

        if config.get("expectedRelease") != RELEASE:
            errors.append("site audit expectedRelease is not 217")
        for relative in (
            "accessibility.html",
            "assets/css/accessibility-preferences.css",
            "assets/js/accessibility-preferences.mjs",
        ):
            if relative not in config.get("requiredFiles", []):
                errors.append(f"site audit does not require {relative}")

        if read(root, "sitemap.xml").count("https://omsaravanabhava.org/accessibility.html") != 1:
            errors.append("sitemap must contain accessibility route once")

        worker = read(root, "service-worker.js")
        if "const RELEASE = '217';" not in worker:
            errors.append("service-worker identity is not 217")
        core = re.search(r"const CORE_PRECACHE_URLS = \[(.*?)\];", worker, re.S)
        optional = re.search(r"const PRECACHE_URLS = \[(.*?)\];", worker, re.S)
        core_text = core.group(1) if core else ""
        optional_text = optional.group(1) if optional else ""
        for asset in (
            "/accessibility.html",
            "/assets/css/accessibility-preferences.css",
            "/assets/js/accessibility-preferences.mjs",
        ):
            if f'"{asset}"' not in optional_text:
                errors.append(f"optional precache missing {asset}")
            if f'"{asset}"' in core_text:
                errors.append(f"accessibility asset incorrectly blocks installation: {asset}")
        if "cacheOptionalAssets" not in worker:
            errors.append("resilient optional caching is missing")

        module = read(root, "assets/js/accessibility-preferences.mjs")
        for marker in (
            "export const RELEASE = 217;",
            "largeText",
            "highContrast",
            "reducedMotion",
            "underlinedLinks",
            "localStorage",
        ):
            if marker not in module:
                errors.append(f"accessibility module missing marker: {marker}")
        for prohibited in ("navigator.sendBeacon", "gtag(", "google-analytics", "api.openai.com"):
            if prohibited in module:
                errors.append(f"prohibited remote marker found: {prohibited}")

        bootstrap = read(root, "assets/js/pwa-register.js")
        if "accessibility-preferences.mjs" not in bootstrap or "applyStoredPreferences" not in bootstrap:
            errors.append("shared bootstrap does not apply stored accessibility preferences")

        for html in ("index.html", "platform.html", "accessibility.html"):
            body = read(root, html)
            if 'data-release="217"' not in body:
                errors.append(f"{html} does not expose data-release 217")
            if "accessibility.html" not in body:
                errors.append(f"{html} does not link to Accessibility Centre")

        smoke = read(root, "tools/production_smoke.py")
        for marker in (
            'data-release="217"',
            "const RELEASE = '217';",
            "export const RELEASE = 216;",
            "/accessibility.html",
            "export const RELEASE = 217",
            "release-217-production-smoke.json",
        ):
            if marker not in smoke:
                errors.append(f"production smoke missing marker: {marker}")
        if "release-215-production-smoke.json" in smoke:
            errors.append("production smoke retains stale Release 215 artifact path")

        for workflow in (
            ".github/workflows/static-site-integrity.yml",
            ".github/workflows/production-smoke.yml",
        ):
            text = read(root, workflow)
            if "217" not in text or "release-217-" not in text:
                errors.append(f"{workflow} has stale release identity")

        if not args.package_mode:
            for relative in (
                "assets/css/osb44.css",
                "tools/site_audit.py",
                "tests/reading-list.test.mjs",
                "tests/search-facets.test.mjs",
            ):
                if not (root / relative).is_file():
                    errors.append(f"repository mode requires {relative}")

    report = {
        "release": 217,
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
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
