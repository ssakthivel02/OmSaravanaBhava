#!/usr/bin/env python3
"""Validate Release 228 without claiming remote CI or deployment results."""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

RELEASE = "228"
BASE_COMMIT = "25598978c0fc330e15da527b54ac51594a204435"
ROUTE = "/devotional-practice-planner.html"

REQUIRED = [
    "devotional-practice-planner.html",
    "assets/css/devotional-practice-planner.css",
    "assets/js/devotional-practice-planner.mjs",
    "data/devotional-practice-planner.json",
    "assets/js/personal-data.mjs",
    "data/personal-data-registry.json",
    "index.html",
    "platform.html",
    "discovery.html",
    "reading-workspace.html",
    "reading-notes.html",
    "personal-library.html",
    "devotional-collections.html",
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
    "tests/devotional-practice-planner.test.mjs",
    "tests/personal-data.test.mjs",
    "tests/maintenance-centre.test.mjs",
    ".github/workflows/static-site-integrity.yml",
    ".github/workflows/production-smoke.yml",
    "manifest-release-228.json",
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
        default=Path("artifacts/release-228-validation.json")
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
        manifest = json.loads(read(root, "manifest-release-228.json"))
        planner = json.loads(read(root, "data/devotional-practice-planner.json"))
        personal = json.loads(read(root, "data/personal-data-registry.json"))
        routes = json.loads(read(root, "data/site-routes.json"))
        maintenance = json.loads(read(root, "data/maintenance-checks.json"))
        audit = json.loads(read(root, "quality/site-audit-config.json"))
        ET.fromstring(read(root, "sitemap.xml"))

        if manifest.get("release") != 228:
            errors.append("manifest release is not 228")
        if manifest.get("base_commit") != BASE_COMMIT:
            errors.append("manifest base commit does not match Release 227 head")

        expected_planner = {
            "release": 228,
            "builtAgainstCommit": BASE_COMMIT,
            "storageKey": "osb-devotional-practice-plans-v1",
            "maximumPlans": 12,
            "maximumRoutesPerPlan": 50,
            "maximumCheckInsPerPlan": 180,
        }
        for key, expected in expected_planner.items():
            if planner.get(key) != expected:
                errors.append(f"planner {key} is incorrect")

        dataset_ids = [
            item.get("id")
            for item in personal.get("datasets", [])
            if isinstance(item, dict)
        ]
        expected_ids = [
            "readingList",
            "readingProgress",
            "readingNotes",
            "accessibility",
            "audioHistory",
            "collections",
            "practicePlans",
        ]
        if personal.get("release") != 228:
            errors.append("personal-data registry release is not 228")
        if personal.get("builtAgainstCommit") != BASE_COMMIT:
            errors.append("personal-data registry base commit is incorrect")
        if dataset_ids != expected_ids:
            errors.append(f"personal-data dataset order differs: {dataset_ids}")

        practice_dataset = next(
            (
                item for item in personal.get("datasets", [])
                if item.get("id") == "practicePlans"
            ),
            None
        )
        if not practice_dataset:
            errors.append("practicePlans backup dataset is missing")
        else:
            for key, expected in {
                "storageKey": "osb-devotional-practice-plans-v1",
                "maximumItems": 12,
                "maximumRoutesPerPlan": 50,
                "maximumCheckInsPerPlan": 180,
            }.items():
                if practice_dataset.get(key) != expected:
                    errors.append(f"practicePlans {key} is incorrect")

        if routes.get("release") != 228:
            errors.append("route directory release is not 228")
        if maintenance.get("release") != 228:
            errors.append("maintenance registry release is not 228")
        if maintenance.get("builtAgainstCommit") != BASE_COMMIT:
            errors.append("maintenance registry base commit is incorrect")

        route_records = routes.get("routes", [])
        route_paths = [
            item.get("path")
            for item in route_records
            if isinstance(item, dict)
        ]
        if route_paths.count(ROUTE) != 1:
            errors.append("planner route must appear exactly once")
        if len(route_paths) != len(set(route_paths)):
            errors.append("duplicate route-directory paths detected")
        record = next(
            (item for item in route_records if item.get("path") == ROUTE),
            None
        )
        if record and record.get("status") != "utility":
            errors.append("planner route must remain utility")

        if audit.get("expectedRelease") != RELEASE:
            errors.append("site-audit expectedRelease is not 228")
        required_audit = (
            "devotional-practice-planner.html",
            "assets/css/devotional-practice-planner.css",
            "assets/js/devotional-practice-planner.mjs",
            "data/devotional-practice-planner.json",
            "manifest-release-228.json",
            "assets/js/personal-data.mjs",
            "data/personal-data-registry.json",
        )
        for relative in required_audit:
            if relative not in audit.get("requiredFiles", []):
                errors.append(f"site audit does not require {relative}")

        sitemap = read(root, "sitemap.xml")
        planner_url = (
            "https://omsaravanabhava.org/"
            "devotional-practice-planner.html"
        )
        if sitemap.count(planner_url) != 1:
            errors.append("sitemap must contain planner route once")

        worker = read(root, "service-worker.js")
        if "const RELEASE = '228';" not in worker:
            errors.append("service-worker identity is not 228")
        core_match = re.search(
            r"const CORE_PRECACHE_URLS = \[(.*?)\];",
            worker,
            re.S
        )
        optional_match = re.search(
            r"const PRECACHE_URLS = \[(.*?)\];",
            worker,
            re.S
        )
        core = core_match.group(1) if core_match else ""
        optional = optional_match.group(1) if optional_match else ""
        new_assets = (
            "/devotional-practice-planner.html",
            "/assets/css/devotional-practice-planner.css",
            "/assets/js/devotional-practice-planner.mjs",
            "/data/devotional-practice-planner.json",
            "/manifest-release-228.json",
        )
        for asset in new_assets:
            if f'"{asset}"' not in optional:
                errors.append(f"optional precache missing {asset}")
            if f'"{asset}"' in core:
                errors.append(
                    f"planner asset incorrectly blocks installation: {asset}"
                )
        if "cacheOptionalAssets" not in worker:
            errors.append("resilient optional caching is missing")

        module = read(root, "assets/js/devotional-practice-planner.mjs")
        for marker in (
            "export const RELEASE = 228;",
            "osb-devotional-practice-plans-v1",
            "sanitisePlan",
            "normaliseEligibleRoutes",
            "createPlan",
            "checkInPlan",
            "isPlanDueOnDate",
            "resolvePlans",
            "buildPlannerMetrics",
            "No notification or spiritual outcome is implied",
        ):
            if marker not in module:
                errors.append(f"planner module missing marker: {marker}")
        for marker in (
            "Notification.requestPermission",
            "showNotification",
            "navigator.sendBeacon",
            "gtag(",
            "google-analytics",
            "api.openai.com",
            "localStorage.clear(",
            "document.body.innerText",
            "document.body.textContent",
            "selectedText:",
            "pageBody:",
            "streak",
        ):
            if marker in module:
                errors.append(
                    f"prohibited notification, tracking or claim marker found: {marker}"
                )

        personal_module = read(root, "assets/js/personal-data.mjs")
        for marker in (
            "export const RELEASE = 228;",
            "'practicePlans'",
            "sanitisePracticePlans",
            "osb-devotional-practice-plans-v1",
        ):
            if marker not in personal_module:
                errors.append(
                    f"personal-data module missing planner marker: {marker}"
                )

        page = read(root, "devotional-practice-planner.html")
        for marker in (
            'data-release="228"',
            "Devotional Practice Planner",
            "planning guidance only",
            "organisational markers",
            "seventh bounded dataset",
            "No streaks, scores, spiritual-outcome claims",
        ):
            if marker not in page:
                errors.append(f"planner page missing marker: {marker}")

        current_pages = (
            "index.html",
            "platform.html",
            "discovery.html",
            "reading-workspace.html",
            "reading-notes.html",
            "personal-library.html",
            "devotional-collections.html",
            "personal-data.html",
            "maintenance.html",
        )
        for html in current_pages:
            body = read(root, html)
            if 'data-release="228"' not in body:
                errors.append(f"{html} does not expose data-release 228")
            if "devotional-practice-planner.html" not in body:
                errors.append(f"{html} does not link to Practice Planner")
            if re.search(
                r'data-release="(222|223|224|225|226|227)"',
                body
            ):
                errors.append(f"{html} contains stale data-release identity")

        maintenance_module = read(
            root,
            "assets/js/maintenance-centre.mjs"
        )
        if "export const RELEASE = 228;" not in maintenance_module:
            errors.append("maintenance module did not advance to 228")

        checks_registry = maintenance.get("checks", [])
        if len(checks_registry) != 8:
            errors.append("maintenance registry must contain eight checks")
        if not any(
            item.get("path") == ROUTE
            for item in checks_registry
        ):
            errors.append("maintenance registry does not check Practice Planner")

        smoke = read(root, "tools/production_smoke.py")
        for marker in (
            'data-release="228"',
            "const RELEASE = '228';",
            "/devotional-practice-planner.html",
            "export const RELEASE = 228",
            "devotional-practice-planner.json",
            "personal-data-registry.json",
            "manifest-release-228.json",
            "release-228-production-smoke.json",
        ):
            if marker not in smoke:
                errors.append(f"production smoke missing marker: {marker}")

        for workflow in (
            ".github/workflows/static-site-integrity.yml",
            ".github/workflows/production-smoke.yml",
        ):
            text = read(root, workflow)
            if "228" not in text or "release-228-" not in text:
                errors.append(f"{workflow} has stale release identity")

    report = {
        "release": 228,
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
