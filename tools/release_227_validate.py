#!/usr/bin/env python3
"""Validate Release 227 without claiming remote CI or deployment results."""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

RELEASE = "227"
BASE_COMMIT = "a241ba10ff7fc319a4347d616e2f0c6bb816cbd7"
ROUTE = "/devotional-collections.html"

REQUIRED = [
    "devotional-collections.html",
    "assets/css/devotional-collections.css",
    "assets/js/devotional-collections.mjs",
    "data/devotional-collections.json",
    "assets/js/personal-data.mjs",
    "data/personal-data-registry.json",
    "index.html",
    "platform.html",
    "discovery.html",
    "reading-workspace.html",
    "reading-notes.html",
    "personal-library.html",
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
    "tests/devotional-collections.test.mjs",
    "tests/personal-data.test.mjs",
    "tests/maintenance-centre.test.mjs",
    ".github/workflows/static-site-integrity.yml",
    ".github/workflows/production-smoke.yml",
    "manifest-release-227.json",
]

def read(root: Path, relative: str) -> str:
    return (root / relative).read_text(encoding="utf-8")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--root",
        type=Path,
        default=Path.cwd()
    )
    parser.add_argument(
        "--package-mode",
        action="store_true"
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path(
            "artifacts/release-227-validation.json"
        )
    )
    args = parser.parse_args()
    root = args.root.resolve()

    errors: list[str] = []
    checks: list[str] = []

    for relative in REQUIRED:
        if not (root / relative).is_file():
            errors.append(
                f"missing required file: {relative}"
            )
        else:
            checks.append(f"exists: {relative}")

    if not errors:
        manifest = json.loads(
            read(root, "manifest-release-227.json")
        )
        collections = json.loads(
            read(root, "data/devotional-collections.json")
        )
        personal = json.loads(
            read(root, "data/personal-data-registry.json")
        )
        routes = json.loads(
            read(root, "data/site-routes.json")
        )
        maintenance = json.loads(
            read(root, "data/maintenance-checks.json")
        )
        audit = json.loads(
            read(root, "quality/site-audit-config.json")
        )
        ET.fromstring(read(root, "sitemap.xml"))

        if manifest.get("release") != 227:
            errors.append(
                "manifest release is not 227"
            )
        if manifest.get("base_commit") != BASE_COMMIT:
            errors.append(
                "manifest base commit does not match Release 226 head"
            )
        if collections.get("release") != 227:
            errors.append(
                "collections config release is not 227"
            )
        if (
            collections.get("builtAgainstCommit")
            != BASE_COMMIT
        ):
            errors.append(
                "collections config base commit is incorrect"
            )
        if (
            collections.get("storageKey")
            != "osb-devotional-collections-v1"
        ):
            errors.append(
                "collections storage key is incorrect"
            )
        if (
            collections.get("maximumCollections")
            != 20
        ):
            errors.append(
                "maximumCollections must remain 20"
            )
        if (
            collections.get(
                "maximumRoutesPerCollection"
            )
            != 50
        ):
            errors.append(
                "maximumRoutesPerCollection must remain 50"
            )

        if personal.get("release") != 227:
            errors.append(
                "personal-data registry release is not 227"
            )
        if (
            personal.get("builtAgainstCommit")
            != BASE_COMMIT
        ):
            errors.append(
                "personal-data registry base commit is incorrect"
            )
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
        ]
        if dataset_ids != expected_ids:
            errors.append(
                f"personal-data dataset order differs: {dataset_ids}"
            )
        collection_dataset = next(
            (
                item
                for item in personal.get("datasets", [])
                if item.get("id") == "collections"
            ),
            None
        )
        if not collection_dataset:
            errors.append(
                "collections backup dataset is missing"
            )
        else:
            if (
                collection_dataset.get("storageKey")
                != "osb-devotional-collections-v1"
            ):
                errors.append(
                    "collections backup storage key is incorrect"
                )
            if (
                collection_dataset.get("maximumItems")
                != 20
            ):
                errors.append(
                    "collections backup item cap is incorrect"
                )
            if (
                collection_dataset.get(
                    "maximumRoutesPerCollection"
                )
                != 50
            ):
                errors.append(
                    "collections nested route cap is incorrect"
                )

        if routes.get("release") != 227:
            errors.append(
                "route directory release is not 227"
            )
        if maintenance.get("release") != 227:
            errors.append(
                "maintenance registry release is not 227"
            )
        if (
            maintenance.get("builtAgainstCommit")
            != BASE_COMMIT
        ):
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
                "collections route must appear exactly once"
            )
        if len(route_paths) != len(set(route_paths)):
            errors.append(
                "duplicate route-directory paths detected"
            )
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
                "collections route must remain utility"
            )

        if audit.get("expectedRelease") != RELEASE:
            errors.append(
                "site-audit expectedRelease is not 227"
            )
        for relative in (
            "devotional-collections.html",
            "assets/css/devotional-collections.css",
            "assets/js/devotional-collections.mjs",
            "data/devotional-collections.json",
            "manifest-release-227.json",
            "assets/js/personal-data.mjs",
            "data/personal-data-registry.json",
        ):
            if relative not in audit.get(
                "requiredFiles",
                []
            ):
                errors.append(
                    f"site audit does not require {relative}"
                )

        sitemap = read(root, "sitemap.xml")
        if sitemap.count(
            "https://omsaravanabhava.org/devotional-collections.html"
        ) != 1:
            errors.append(
                "sitemap must contain collections route once"
            )

        worker = read(root, "service-worker.js")
        if "const RELEASE = '227';" not in worker:
            errors.append(
                "service-worker identity is not 227"
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
        optional_text = (
            optional.group(1)
            if optional
            else ""
        )
        for asset in (
            "/devotional-collections.html",
            "/assets/css/devotional-collections.css",
            "/assets/js/devotional-collections.mjs",
            "/data/devotional-collections.json",
            "/manifest-release-227.json",
        ):
            if f'"{asset}"' not in optional_text:
                errors.append(
                    f"optional precache missing {asset}"
                )
            if f'"{asset}"' in core_text:
                errors.append(
                    f"collections asset incorrectly blocks installation: {asset}"
                )
        if "cacheOptionalAssets" not in worker:
            errors.append(
                "resilient optional caching is missing"
            )

        module = read(
            root,
            "assets/js/devotional-collections.mjs"
        )
        for marker in (
            "export const RELEASE = 227;",
            "osb-devotional-collections-v1",
            "sanitiseCollection",
            "normaliseEligibleRoutes",
            "resolveCollections",
            "buildCollectionMetrics",
            "addRouteToCollection",
            "moveRouteInCollection",
            "normaliseCollectionRoute",
        ):
            if marker not in module:
                errors.append(
                    f"collections module missing marker: {marker}"
                )
        for prohibited in (
            "navigator.sendBeacon",
            "gtag(",
            "google-analytics",
            "api.openai.com",
            "localStorage.clear(",
            "document.body.innerText",
            "document.body.textContent",
            "selectedText:",
            "pageBody:",
            "content: document",
        ):
            if prohibited in module:
                errors.append(
                    f"prohibited tracking or source-text marker found: {prohibited}"
                )

        personal_module = read(
            root,
            "assets/js/personal-data.mjs"
        )
        for marker in (
            "export const RELEASE = 227;",
            "'collections'",
            "sanitiseCollections",
            "osb-devotional-collections-v1",
        ):
            if marker not in personal_module:
                errors.append(
                    f"personal-data module missing collections marker: {marker}"
                )

        page = read(
            root,
            "devotional-collections.html"
        )
        for marker in (
            'data-release="227"',
            "Devotional Collections Centre",
            "Only same-origin route references",
            "never devotional text",
            "sixth registered local dataset",
            "No account, cloud synchronization, analytics",
        ):
            if marker not in page:
                errors.append(
                    f"collections page missing marker: {marker}"
                )

        for html in (
            "index.html",
            "platform.html",
            "discovery.html",
            "reading-workspace.html",
            "reading-notes.html",
            "personal-library.html",
            "personal-data.html",
            "maintenance.html",
        ):
            body = read(root, html)
            if 'data-release="227"' not in body:
                errors.append(
                    f"{html} does not expose data-release 227"
                )
            if "devotional-collections.html" not in body:
                errors.append(
                    f"{html} does not link to Collections"
                )
            if re.search(
                r'data-release="(222|223|224|225|226)"',
                body
            ):
                errors.append(
                    f"{html} contains stale data-release identity"
                )

        maintenance_module = read(
            root,
            "assets/js/maintenance-centre.mjs"
        )
        if (
            "export const RELEASE = 227;"
            not in maintenance_module
        ):
            errors.append(
                "maintenance module did not advance to 227"
            )

        checks_registry = maintenance.get(
            "checks",
            []
        )
        if len(checks_registry) != 8:
            errors.append(
                "maintenance registry must contain eight checks"
            )
        if not any(
            item.get("path")
            == "/devotional-collections.html"
            for item in checks_registry
        ):
            errors.append(
                "maintenance registry does not check Collections"
            )

        smoke = read(
            root,
            "tools/production_smoke.py"
        )
        for marker in (
            'data-release="227"',
            "const RELEASE = '227';",
            "/devotional-collections.html",
            "export const RELEASE = 227",
            "devotional-collections.json",
            "personal-data-registry.json",
            "manifest-release-227.json",
            "release-227-production-smoke.json",
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
            if (
                "227" not in text
                or "release-227-" not in text
            ):
                errors.append(
                    f"{workflow} has stale release identity"
                )

        if not args.package_mode:
            for relative in (
                "assets/js/personal-library.mjs",
                "assets/js/reading-notes.mjs",
                "assets/js/reader-experience.js",
                "assets/js/reading-list.mjs",
                "assets/js/accessibility-preferences.mjs",
                "assets/js/audio-history.mjs",
                "tools/site_audit.py",
                "tests/personal-library.test.mjs",
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
                    errors.append(
                        f"repository mode requires {relative}"
                    )

    report = {
        "release": 227,
        "base_commit": BASE_COMMIT,
        "mode":
            "package"
            if args.package_mode
            else "repository",
        "status":
            "FAIL"
            if errors
            else "PASS",
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
    report_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )
    report_path.write_text(
        json.dumps(
            report,
            ensure_ascii=False,
            indent=2
        ) + "\n",
        encoding="utf-8"
    )
    print(
        json.dumps(
            report,
            ensure_ascii=False,
            indent=2
        )
    )
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
