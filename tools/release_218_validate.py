#!/usr/bin/env python3
"""Validate Release 218 without claiming remote CI or deployment results."""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

RELEASE = "218"
BASE_COMMIT = "512a2ecccb15c0ef79c5a22fa3afe0c624cb349b"
ROUTE = "/print-pdf.html"
REQUIRED = [
    "print-pdf.html",
    "assets/css/print-support.css",
    "assets/js/print-support.mjs",
    "assets/js/pwa-register.js",
    "index.html",
    "platform.html",
    "data/site-routes.json",
    "sitemap.xml",
    "service-worker.js",
    "quality/site-audit-config.json",
    "tools/production_smoke.py",
    "tests/test_site_audit.py",
    "tests/print-support.test.mjs",
    ".github/workflows/static-site-integrity.yml",
    ".github/workflows/production-smoke.yml",
    "manifest-release-218.json",
]

def read(root: Path, relative: str) -> str:
    return (root / relative).read_text(encoding="utf-8")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--package-mode", action="store_true")
    parser.add_argument("--report", type=Path, default=Path("artifacts/release-218-validation.json"))
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
        manifest = json.loads(read(root, "manifest-release-218.json"))
        routes = json.loads(read(root, "data/site-routes.json"))
        config = json.loads(read(root, "quality/site-audit-config.json"))
        ET.fromstring(read(root, "sitemap.xml"))

        if manifest.get("release") != 218:
            errors.append("manifest release is not 218")
        if manifest.get("base_commit") != BASE_COMMIT:
            errors.append("manifest base commit does not match Release 217 head")
        if routes.get("release") != 218:
            errors.append("route directory release is not 218")

        route_records = routes.get("routes", [])
        paths = [item.get("path") for item in route_records if isinstance(item, dict)]
        if paths.count(ROUTE) != 1:
            errors.append("print route must appear exactly once")
        if len(paths) != len(set(paths)):
            errors.append("duplicate route directory paths detected")
        route = next((item for item in route_records if item.get("path") == ROUTE), None)
        if route and route.get("status") != "utility":
            errors.append("print route status must remain utility")

        if config.get("expectedRelease") != RELEASE:
            errors.append("site audit expectedRelease is not 218")
        for relative in (
            "print-pdf.html",
            "assets/css/print-support.css",
            "assets/js/print-support.mjs",
        ):
            if relative not in config.get("requiredFiles", []):
                errors.append(f"site audit does not require {relative}")

        if read(root, "sitemap.xml").count("https://omsaravanabhava.org/print-pdf.html") != 1:
            errors.append("sitemap must contain print route exactly once")

        worker = read(root, "service-worker.js")
        if "const RELEASE = '218';" not in worker:
            errors.append("service-worker identity is not 218")
        core = re.search(r"const CORE_PRECACHE_URLS = \[(.*?)\];", worker, re.S)
        optional = re.search(r"const PRECACHE_URLS = \[(.*?)\];", worker, re.S)
        core_text = core.group(1) if core else ""
        optional_text = optional.group(1) if optional else ""
        for asset in (
            "/print-pdf.html",
            "/assets/css/print-support.css",
            "/assets/js/print-support.mjs",
        ):
            if f'"{asset}"' not in optional_text:
                errors.append(f"optional precache missing {asset}")
            if f'"{asset}"' in core_text:
                errors.append(f"print asset incorrectly blocks installation: {asset}")
        if "cacheOptionalAssets" not in worker:
            errors.append("resilient optional caching is missing")

        module = read(root, "assets/js/print-support.mjs")
        for marker in (
            "export const RELEASE = 218;",
            "windowRef.print",
            "print-support.css",
            "Print / Save PDF",
            "Browser-generated print or PDF copy",
        ):
            if marker not in module:
                errors.append(f"print module missing marker: {marker}")
        for prohibited in (
            "jsPDF",
            "pdfmake",
            "api.openai.com",
            "navigator.sendBeacon",
            "google-analytics",
        ):
            if prohibited in module:
                errors.append(f"prohibited marker found: {prohibited}")

        css = read(root, "assets/css/print-support.css")
        for marker in (
            "@media print",
            "@page",
            ".osb-print-header",
            "[data-print-exclude",
        ):
            if marker not in css:
                errors.append(f"print CSS missing marker: {marker}")

        bootstrap = read(root, "assets/js/pwa-register.js")
        if "print-support.mjs" not in bootstrap:
            errors.append("shared bootstrap does not load print support")

        for html in ("index.html", "platform.html", "print-pdf.html"):
            body = read(root, html)
            if 'data-release="218"' not in body:
                errors.append(f"{html} does not expose data-release 218")
            if "print-pdf.html" not in body:
                errors.append(f"{html} does not link to print guidance")

        smoke = read(root, "tools/production_smoke.py")
        for marker in (
            'data-release="218"',
            "const RELEASE = '218';",
            "/print-pdf.html",
            "export const RELEASE = 218",
            "print-support.mjs",
            "release-218-production-smoke.json",
        ):
            if marker not in smoke:
                errors.append(f"production smoke missing marker: {marker}")

        for workflow in (
            ".github/workflows/static-site-integrity.yml",
            ".github/workflows/production-smoke.yml",
        ):
            body = read(root, workflow)
            if "218" not in body or "release-218-" not in body:
                errors.append(f"{workflow} has stale release identity")

        if not args.package_mode:
            for relative in (
                "assets/css/osb44.css",
                "tools/site_audit.py",
                "tests/accessibility-preferences.test.mjs",
                "tests/reading-list.test.mjs",
                "tests/search-facets.test.mjs",
            ):
                if not (root / relative).is_file():
                    errors.append(f"repository mode requires {relative}")

    report = {
        "release": 218,
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
