#!/usr/bin/env python3
"""Validate Release 220 without claiming GitHub Actions or deployed production results."""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

RELEASE = "220"
BASE_COMMIT = "76414c2834dd291d2432832cdc81f5f954137eac"
ROUTE = "/knowledge-graph-explorer.html"
REQUIRED = [
    "knowledge-graph.html",
    "knowledge-graph-explorer.html",
    "assets/css/knowledge-graph-explorer.css",
    "assets/js/knowledge-graph-explorer.mjs",
    "data/knowledge-graph-explorer.json",
    "index.html",
    "platform.html",
    "data/site-routes.json",
    "sitemap.xml",
    "service-worker.js",
    "quality/site-audit-config.json",
    "tools/production_smoke.py",
    "tests/test_site_audit.py",
    "tests/knowledge-graph-explorer.test.mjs",
    ".github/workflows/static-site-integrity.yml",
    ".github/workflows/production-smoke.yml",
    "manifest-release-220.json",
]

def read(root: Path, relative: str) -> str:
    return (root / relative).read_text(encoding="utf-8")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--package-mode", action="store_true")
    parser.add_argument("--report", type=Path, default=Path("artifacts/release-220-validation.json"))
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
        manifest = json.loads(read(root, "manifest-release-220.json"))
        routes = json.loads(read(root, "data/site-routes.json"))
        graph = json.loads(read(root, "data/knowledge-graph-explorer.json"))
        config = json.loads(read(root, "quality/site-audit-config.json"))
        ET.fromstring(read(root, "sitemap.xml"))

        if manifest.get("release") != 220:
            errors.append("manifest release is not 220")
        if manifest.get("base_commit") != BASE_COMMIT:
            errors.append("manifest base commit does not match Release 219 head")
        if routes.get("release") != 220:
            errors.append("route directory release is not 220")
        if graph.get("release") != 220:
            errors.append("graph data release is not 220")

        route_records = routes.get("routes", [])
        route_paths = [
            item.get("path")
            for item in route_records
            if isinstance(item, dict)
        ]
        if route_paths.count(ROUTE) != 1:
            errors.append("graph explorer route must appear exactly once")
        if len(route_paths) != len(set(route_paths)):
            errors.append("duplicate route directory paths detected")
        explorer_route = next(
            (item for item in route_records if item.get("path") == ROUTE),
            None
        )
        if explorer_route and explorer_route.get("status") != "published":
            errors.append("graph explorer route must be published")

        if config.get("expectedRelease") != RELEASE:
            errors.append("site audit expectedRelease is not 220")
        for relative in (
            "knowledge-graph-explorer.html",
            "assets/css/knowledge-graph-explorer.css",
            "assets/js/knowledge-graph-explorer.mjs",
            "data/knowledge-graph-explorer.json",
        ):
            if relative not in config.get("requiredFiles", []):
                errors.append(f"site audit does not require {relative}")

        sitemap = read(root, "sitemap.xml")
        if sitemap.count("https://omsaravanabhava.org/knowledge-graph-explorer.html") != 1:
            errors.append("sitemap must contain graph explorer route exactly once")

        worker = read(root, "service-worker.js")
        if "const RELEASE = '220';" not in worker:
            errors.append("service-worker identity is not 220")
        core = re.search(r"const CORE_PRECACHE_URLS = \[(.*?)\];", worker, re.S)
        optional = re.search(r"const PRECACHE_URLS = \[(.*?)\];", worker, re.S)
        core_text = core.group(1) if core else ""
        optional_text = optional.group(1) if optional else ""
        for asset in (
            "/knowledge-graph-explorer.html",
            "/assets/css/knowledge-graph-explorer.css",
            "/assets/js/knowledge-graph-explorer.mjs",
            "/data/knowledge-graph-explorer.json",
        ):
            if f'"{asset}"' not in optional_text:
                errors.append(f"optional precache missing {asset}")
            if f'"{asset}"' in core_text:
                errors.append(f"graph asset incorrectly blocks installation: {asset}")
        if "cacheOptionalAssets" not in worker:
            errors.append("resilient optional caching is missing")

        datasets = graph.get("datasets", [])
        nodes = graph.get("nodes", [])
        relationships = graph.get("relationships", [])
        dataset_ids = [
            item.get("id") for item in datasets if isinstance(item, dict)
        ]
        node_ids = [
            item.get("id") for item in nodes if isinstance(item, dict)
        ]
        relationship_ids = [
            item.get("id")
            for item in relationships
            if isinstance(item, dict)
        ]
        if len(dataset_ids) != len(set(dataset_ids)):
            errors.append("duplicate graph dataset ids")
        if len(node_ids) != len(set(node_ids)):
            errors.append("duplicate graph node ids")
        if len(relationship_ids) != len(set(relationship_ids)):
            errors.append("duplicate graph relationship ids")
        if len(datasets) != 5:
            errors.append("expected five existing graph registers")
        if len(nodes) != 23:
            errors.append("expected 23 explorer nodes")
        if len(relationships) != 20:
            errors.append("expected 20 metadata relationships")

        node_set = set(node_ids)
        for edge in relationships:
            if edge.get("source") not in node_set or edge.get("target") not in node_set:
                errors.append(f"relationship references missing node: {edge.get('id')}")

        explicit_counts = {
            dataset_id: sum(
                1
                for node in nodes
                if node.get("nodeClass") == "Explicit entity"
                and node.get("datasetId") == dataset_id
            )
            for dataset_id in dataset_ids
        }
        expected_explicit = {
            "murugan-phase-1": 7,
            "murugan-phase-3": 0,
            "murugan-phase-4": 0,
            "siddhar-phase-1": 6,
            "skanda-purana-phase-2": 5,
        }
        if explicit_counts != expected_explicit:
            errors.append(
                f"explicit source-card counts differ: {explicit_counts}"
            )

        reported_relationship_total = sum(
            item.get("reportedRelationshipCount") or 0
            for item in datasets
        )
        if reported_relationship_total != 27:
            errors.append("reported relationship total must remain 27")
        if sum(
            1
            for item in datasets
            if item.get("reportedRelationshipCount") is None
        ) != 2:
            errors.append("two graph registers must retain unpublished relationship totals")

        module = read(root, "assets/js/knowledge-graph-explorer.mjs")
        for marker in (
            "export const RELEASE = 220;",
            "reportedRelationshipTotal",
            "unspecifiedRelationshipDatasets",
            "filterGraph",
            "nodeNeighbours",
            "layoutGraph",
        ):
            if marker not in module:
                errors.append(f"graph module missing marker: {marker}")
        for prohibited in (
            "d3.",
            "vis.Network",
            "cytoscape",
            "api.openai.com",
            "navigator.sendBeacon",
            "gtag(",
        ):
            if prohibited in module:
                errors.append(f"prohibited remote or library marker found: {prohibited}")

        for html in (
            "index.html",
            "platform.html",
            "knowledge-graph.html",
            "knowledge-graph-explorer.html",
        ):
            body = read(root, html)
            if 'data-release="220"' not in body:
                errors.append(f"{html} does not expose data-release 220")
            if "knowledge-graph-explorer.html" not in body:
                errors.append(f"{html} does not link to graph explorer")

        explorer = read(root, "knowledge-graph-explorer.html")
        for marker in (
            "Reported domain-relationship totals",
            "do not expose node-level records",
            "does not claim complete Murugan",
        ):
            if marker not in explorer:
                errors.append(f"graph boundary text missing: {marker}")

        smoke = read(root, "tools/production_smoke.py")
        for marker in (
            'data-release="220"',
            "const RELEASE = '220';",
            "/knowledge-graph-explorer.html",
            "export const RELEASE = 220",
            "knowledge-graph-explorer.json",
            "release-220-production-smoke.json",
        ):
            if marker not in smoke:
                errors.append(f"production smoke missing marker: {marker}")

        for workflow in (
            ".github/workflows/static-site-integrity.yml",
            ".github/workflows/production-smoke.yml",
        ):
            text = read(root, workflow)
            if "220" not in text or "release-220-" not in text:
                errors.append(f"{workflow} has stale release identity")

        if not args.package_mode:
            for relative in (
                "knowledge-graph-phase-3.html",
                "knowledge-graph-phase-4.html",
                "siddhar-knowledge-graph.html",
                "skanda-purana-graph.html",
                "assets/css/osb44.css",
                "tools/site_audit.py",
                "tests/audio-history.test.mjs",
                "tests/print-support.test.mjs",
                "tests/accessibility-preferences.test.mjs",
                "tests/reading-list.test.mjs",
                "tests/search-facets.test.mjs",
            ):
                if not (root / relative).is_file():
                    errors.append(f"repository mode requires {relative}")

    report = {
        "release": 220,
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
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
