#!/usr/bin/env python3
"""Validate Release 219 without claiming GitHub Actions or production results."""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

RELEASE = "219"
BASE_COMMIT = "c21007e2038823990f8858ab299f0865de4b78ce"
ROUTE = "/audio-history.html"
REQUIRED = [
    "audio-library.html",
    "audio-history.html",
    "assets/css/audio-history.css",
    "assets/js/audio-history.mjs",
    "index.html",
    "platform.html",
    "data/site-routes.json",
    "sitemap.xml",
    "service-worker.js",
    "quality/site-audit-config.json",
    "tools/production_smoke.py",
    "tests/test_site_audit.py",
    "tests/audio-history.test.mjs",
    ".github/workflows/static-site-integrity.yml",
    ".github/workflows/production-smoke.yml",
    "manifest-release-219.json",
]

def read(root: Path, relative: str) -> str:
    return (root / relative).read_text(encoding="utf-8")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--package-mode", action="store_true")
    parser.add_argument("--report", type=Path, default=Path("artifacts/release-219-validation.json"))
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
        manifest = json.loads(read(root, "manifest-release-219.json"))
        routes = json.loads(read(root, "data/site-routes.json"))
        config = json.loads(read(root, "quality/site-audit-config.json"))
        ET.fromstring(read(root, "sitemap.xml"))

        if manifest.get("release") != 219:
            errors.append("manifest release is not 219")
        if manifest.get("base_commit") != BASE_COMMIT:
            errors.append("manifest base commit does not match Release 218 head")
        if routes.get("release") != 219:
            errors.append("route directory release is not 219")

        records = routes.get("routes", [])
        paths = [item.get("path") for item in records if isinstance(item, dict)]
        if paths.count(ROUTE) != 1:
            errors.append("audio history route must appear exactly once")
        if len(paths) != len(set(paths)):
            errors.append("duplicate route directory paths detected")
        route = next((item for item in records if item.get("path") == ROUTE), None)
        if route and route.get("status") != "utility":
            errors.append("audio history route status must remain utility")

        if config.get("expectedRelease") != RELEASE:
            errors.append("site audit expectedRelease is not 219")
        for relative in (
            "audio-history.html",
            "assets/css/audio-history.css",
            "assets/js/audio-history.mjs",
        ):
            if relative not in config.get("requiredFiles", []):
                errors.append(f"site audit does not require {relative}")

        sitemap = read(root, "sitemap.xml")
        if sitemap.count("https://omsaravanabhava.org/audio-history.html") != 1:
            errors.append("sitemap must contain audio history route exactly once")

        worker = read(root, "service-worker.js")
        if "const RELEASE = '219';" not in worker:
            errors.append("service-worker identity is not 219")
        core = re.search(r"const CORE_PRECACHE_URLS = \[(.*?)\];", worker, re.S)
        optional = re.search(r"const PRECACHE_URLS = \[(.*?)\];", worker, re.S)
        core_text = core.group(1) if core else ""
        optional_text = optional.group(1) if optional else ""
        for asset in (
            "/audio-history.html",
            "/assets/css/audio-history.css",
            "/assets/js/audio-history.mjs",
        ):
            if f'"{asset}"' not in optional_text:
                errors.append(f"optional precache missing {asset}")
            if f'"{asset}"' in core_text:
                errors.append(f"audio history asset incorrectly blocks installation: {asset}")
        if "cacheOptionalAssets" not in worker:
            errors.append("resilient optional caching is missing")

        module = read(root, "assets/js/audio-history.mjs")
        for marker in (
            "export const RELEASE = 219;",
            "osb-audio-listening-history-v1",
            "MAX_HISTORY_ITEMS = 20",
            "Reading section 1 of",
            "MutationObserver",
            "recordingRights",
            "publicationStatus",
            "playbackMode",
        ):
            if marker not in module:
                errors.append(f"audio history module missing marker: {marker}")
        for prohibited in (
            "durationSeconds",
            "completionPercentage",
            "navigator.sendBeacon",
            "gtag(",
            "google-analytics",
            "api.openai.com",
        ):
            if prohibited in module:
                errors.append(f"prohibited or fabricated marker found: {prohibited}")

        audio_page = read(root, "audio-library.html")
        for marker in (
            'data-release="219"',
            "audio-history.mjs",
            "audio-history.html",
            "device speech actually begins",
        ):
            if marker not in audio_page:
                errors.append(f"audio library missing history marker: {marker}")

        history_page = read(root, "audio-history.html")
        for marker in (
            'data-release="219"',
            "Audio Listening History",
            "No synthetic duration",
            "at most 20 unique recent items",
        ):
            if marker not in history_page:
                errors.append(f"audio history page missing boundary marker: {marker}")

        for html in ("index.html", "platform.html"):
            body = read(root, html)
            if 'data-release="219"' not in body:
                errors.append(f"{html} does not expose data-release 219")
            if "audio-history.html" not in body:
                errors.append(f"{html} does not link to audio history")

        smoke = read(root, "tools/production_smoke.py")
        for marker in (
            'data-release="219"',
            "const RELEASE = '219';",
            "/audio-history.html",
            "export const RELEASE = 219",
            "audio-history.mjs",
            "release-219-production-smoke.json",
        ):
            if marker not in smoke:
                errors.append(f"production smoke missing marker: {marker}")

        for workflow in (
            ".github/workflows/static-site-integrity.yml",
            ".github/workflows/production-smoke.yml",
        ):
            text = read(root, workflow)
            if "219" not in text or "release-219-" not in text:
                errors.append(f"{workflow} has stale release identity")

        if not args.package_mode:
            for relative in (
                "data/read-aloud-playlist.json",
                "assets/js/media-session-player.js",
                "assets/css/osb44.css",
                "tools/site_audit.py",
                "tests/print-support.test.mjs",
                "tests/accessibility-preferences.test.mjs",
                "tests/reading-list.test.mjs",
                "tests/search-facets.test.mjs",
            ):
                if not (root / relative).is_file():
                    errors.append(f"repository mode requires {relative}")

    report = {
        "release": 219,
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
