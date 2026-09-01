#!/usr/bin/env python3
"""Release 229 package/repository validator using only the Python standard library."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

RELEASE = 229
BASE_COMMIT = "513949e743a9cab67281fbea7d379bf4c0d06d66"
REQUIRED = [
    "reading-workspace.html",
    "service-worker.js",
    "assets/css/reading-workspace-desktop.css",
    "assets/js/reading-workspace-desktop.mjs",
    "tests/reading-workspace-desktop.test.mjs",
    "tools/release_229_validate.py",
    ".github/workflows/release-229-integrity.yml",
    ".github/workflows/release-229-production-smoke.yml",
    "manifest-release-229.json",
    "RELEASE_229_CHANGED_FILES.txt",
    "RELEASE_229_GITHUB_PORTAL_INSTRUCTIONS.txt",
    "RELEASE_229_LOCAL_TEST_EVIDENCE.txt",
    "RELEASE_229_VALIDATION_REPORT.md",
    "RELEASE_229.patch",
]
NEW_ASSETS = [
    "/assets/css/reading-workspace-desktop.css",
    "/assets/js/reading-workspace-desktop.mjs",
]
FORBIDDEN_MARKERS = [
    "localhost:",
    "127.0.0.1:",
    "BEGIN PRIVATE KEY",
    "api_key=",
    "apikey=",
    "google-analytics",
    "mixpanel",
    "segment.io",
]
ALLOWED_HTML_SCHEMES = {"", "http", "https", "mailto", "tel"}


class PageAudit(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.h1_count = 0
        self.main_count = 0
        self.lang = ""
        self.canonical = ""
        self.title_depth = 0
        self.title_text: list[str] = []
        self.links: list[str] = []
        self.scripts: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        values = dict(attrs)
        if tag == "html":
            self.lang = values.get("lang", "")
        if tag == "h1":
            self.h1_count += 1
        if tag == "main":
            self.main_count += 1
        if tag == "title":
            self.title_depth += 1
        if values.get("id"):
            self.ids.append(values["id"])
        if tag == "link" and values.get("rel") == "canonical":
            self.canonical = values.get("href", "")
        if tag in {"a", "link", "script", "img"}:
            target = values.get("href") or values.get("src")
            if target:
                self.links.append(target)
        if tag == "script":
            self.scripts.append(values)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title" and self.title_depth:
            self.title_depth -= 1

    def handle_data(self, data: str) -> None:
        if self.title_depth:
            self.title_text.append(data)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def run(command: list[str], cwd: Path) -> tuple[int, str]:
    completed = subprocess.run(
        command,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    return completed.returncode, completed.stdout


def audit_release_page(root: Path, errors: list[str], checks: list[str]) -> None:
    path = root / "reading-workspace.html"
    text = path.read_text(encoding="utf-8")
    parser = PageAudit()
    parser.feed(text)
    duplicates = sorted({value for value in parser.ids if parser.ids.count(value) > 1})
    if duplicates:
        errors.append(f"reading-workspace.html duplicate ids: {duplicates}")
    if parser.lang != "ta":
        errors.append("reading-workspace.html must retain lang=ta")
    if parser.h1_count != 1:
        errors.append(f"reading-workspace.html h1 count is {parser.h1_count}")
    if parser.main_count != 1:
        errors.append(f"reading-workspace.html main count is {parser.main_count}")
    if parser.canonical != "https://omsaravanabhava.org/reading-workspace.html":
        errors.append("reading-workspace.html canonical URL is incorrect")
    if not "".join(parser.title_text).strip():
        errors.append("reading-workspace.html title is empty")
    for marker in (
        'data-release="229"',
        'id="readingWorkspaceDesktop"',
        'id="readingWorkspaceRouteList"',
        'role="listbox"',
        'id="readingWorkspaceInspector"',
        'role="status"',
        'aria-live="polite"',
        'type="module" src="assets/js/reading-workspace-desktop.mjs"',
    ):
        if marker not in text:
            errors.append(f"reading-workspace.html missing marker: {marker}")
    checks.append("release page semantics and unique IDs")


def audit_release_assets(root: Path, errors: list[str], checks: list[str]) -> None:
    js = (root / "assets/js/reading-workspace-desktop.mjs").read_text(encoding="utf-8")
    css = (root / "assets/css/reading-workspace-desktop.css").read_text(encoding="utf-8")
    sw = (root / "service-worker.js").read_text(encoding="utf-8")

    for marker in (
        "export const RELEASE = 229;",
        "role', 'option'",
        "aria-selected",
        "ArrowDown",
        "prefers-reduced-motion",
        "loadReadingModel",
    ):
        if marker not in js:
            errors.append(f"desktop module missing marker: {marker}")
    for forbidden in (
        "localStorage.setItem",
        "sessionStorage.setItem",
        "indexedDB.open",
        "navigator.sendBeacon",
    ):
        if forbidden in js:
            errors.append(f"desktop module contains forbidden operation: {forbidden}")
    for marker in (
        "@media (min-width: 1180px)",
        ":focus-visible",
        "@media (prefers-reduced-motion: reduce)",
        "@media print",
    ):
        if marker not in css:
            errors.append(f"desktop stylesheet missing marker: {marker}")
    if "const RELEASE = '228';" not in sw:
        errors.append("service-worker cache generation changed unexpectedly")
    for asset in NEW_ASSETS:
        count = sw.count(f'"{asset}"')
        if count != 1:
            errors.append(f"service-worker must precache {asset} exactly once; found {count}")
    checks.append("desktop module, CSS and additive offline precache")


def audit_manifest(root: Path, errors: list[str], checks: list[str]) -> None:
    manifest = json.loads((root / "manifest-release-229.json").read_text(encoding="utf-8"))
    expected = {
        "release": RELEASE,
        "base_commit": BASE_COMMIT,
        "required_commit_title": "Release 229: add premium desktop literature navigator",
    }
    for key, value in expected.items():
        if manifest.get(key) != value:
            errors.append(f"manifest {key} mismatch: {manifest.get(key)!r}")
    if manifest.get("service_worker_cache_generation") != 228:
        errors.append("manifest must document unchanged service-worker cache generation 228")
    if manifest.get("deleted_files") != []:
        errors.append("manifest must not declare deleted files")
    checks.append("release manifest identity and limitations")


def audit_json(root: Path, errors: list[str], checks: list[str], package_mode: bool) -> None:
    candidates = list(root.rglob("*.json"))
    for path in candidates:
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"invalid JSON {path.relative_to(root)}: {exc}")
    checks.append(f"JSON syntax ({len(candidates)} file(s))")

    if not package_mode:
        route_file = root / "data/site-routes.json"
        if route_file.exists():
            payload = json.loads(route_file.read_text(encoding="utf-8"))
            routes = payload.get("routes", [])
            paths = [item.get("path") for item in routes if isinstance(item, dict)]
            duplicates = sorted({value for value in paths if value and paths.count(value) > 1})
            if duplicates:
                errors.append(f"duplicate route registry paths: {duplicates}")
            if paths.count("/reading-workspace.html") != 1:
                errors.append("route registry must contain /reading-workspace.html exactly once")
            checks.append("route registry uniqueness and existing workspace route")


def audit_repository_html(root: Path, errors: list[str], warnings: list[str], checks: list[str]) -> None:
    html_files = [p for p in root.rglob("*.html") if ".git" not in p.parts]
    for path in html_files:
        parser = PageAudit()
        try:
            parser.feed(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"HTML parse failure {path.relative_to(root)}: {exc}")
            continue
        duplicates = {value for value in parser.ids if parser.ids.count(value) > 1}
        if duplicates:
            errors.append(f"duplicate IDs in {path.relative_to(root)}: {sorted(duplicates)}")
        if parser.h1_count > 1:
            errors.append(f"multiple h1 elements in {path.relative_to(root)}")
        if parser.main_count > 1:
            errors.append(f"multiple main elements in {path.relative_to(root)}")
        for target in parser.links:
            parsed = urlparse(target)
            if parsed.scheme not in ALLOWED_HTML_SCHEMES:
                warnings.append(f"unusual URL scheme in {path.relative_to(root)}: {target}")
    checks.append(f"repository HTML structural scan ({len(html_files)} file(s))")


def audit_sitemap(root: Path, errors: list[str], checks: list[str]) -> None:
    sitemap = root / "sitemap.xml"
    if not sitemap.exists():
        return
    try:
        tree = ET.parse(sitemap)
        locs = [
            (element.text or "").strip()
            for element in tree.iter()
            if element.tag.endswith("loc")
        ]
        duplicates = sorted({loc for loc in locs if loc and locs.count(loc) > 1})
        if duplicates:
            errors.append(f"duplicate sitemap URLs: {duplicates}")
        expected = "https://omsaravanabhava.org/reading-workspace.html"
        if locs.count(expected) != 1:
            errors.append("reading workspace sitemap URL must remain exactly once")
        checks.append("sitemap XML and URL uniqueness")
    except Exception as exc:
        errors.append(f"sitemap XML invalid: {exc}")


def audit_forbidden_markers(root: Path, errors: list[str], checks: list[str]) -> None:
    extensions = {".html", ".js", ".mjs", ".json", ".css", ".py", ".yml", ".yaml"}
    excluded_roots = {".git", ".github", "tools", "tests", "artifacts"}
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in extensions:
            continue
        relative = path.relative_to(root)
        if any(part in excluded_roots for part in relative.parts):
            continue
        if relative.name.startswith("RELEASE_229_") or relative.name == "manifest-release-229.json":
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for marker in FORBIDDEN_MARKERS:
            if marker.lower() in text.lower():
                errors.append(f"forbidden marker {marker!r} in {path.relative_to(root)}")
    checks.append("localhost, credential and tracking marker scan")


def audit_checksums(root: Path, errors: list[str], checks: list[str]) -> None:
    sums = root / "RELEASE_229_SHA256SUMS.txt"
    if not sums.exists():
        return
    for line in sums.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        expected, relative = line.split("  ", 1)
        target = root / relative
        if not target.exists():
            errors.append(f"checksum target missing: {relative}")
        elif sha256(target) != expected:
            errors.append(f"checksum mismatch: {relative}")
    checks.append("final package SHA256 verification")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--package-mode", action="store_true")
    parser.add_argument("--report")
    args = parser.parse_args()
    root = Path(args.root).resolve()

    errors: list[str] = []
    warnings: list[str] = []
    checks: list[str] = []
    skipped: list[str] = []

    for relative in REQUIRED:
        if not (root / relative).exists():
            errors.append(f"required file missing: {relative}")
    checks.append("required release files")

    audit_release_page(root, errors, checks)
    audit_release_assets(root, errors, checks)
    audit_manifest(root, errors, checks)
    audit_json(root, errors, checks, args.package_mode)
    audit_forbidden_markers(root, errors, checks)
    audit_checksums(root, errors, checks)

    # Detect Node without adding a package dependency.
    node_check = subprocess.run(
        ["bash", "-lc", "command -v node >/dev/null 2>&1"],
        cwd=root,
        check=False,
    ).returncode == 0
    if node_check:
        code, output = run(
            ["node", "--check", "assets/js/reading-workspace-desktop.mjs"],
            root,
        )
        if code:
            errors.append(f"node --check failed:\n{output}")
        code, output = run(
            ["node", "--test", "tests/reading-workspace-desktop.test.mjs"],
            root,
        )
        if code:
            errors.append(f"node tests failed:\n{output}")
        checks.append("Node syntax and Release 229 tests")
    else:
        skipped.append("Node syntax/tests unavailable")

    if args.package_mode:
        skipped.extend([
            "full repository HTML scan",
            "full route-file existence scan",
            "deployed production smoke",
            "GitHub Actions conclusion",
        ])
    else:
        audit_repository_html(root, errors, warnings, checks)
        audit_sitemap(root, errors, checks)

    report = {
        "release": RELEASE,
        "base_commit": BASE_COMMIT,
        "mode": "package" if args.package_mode else "repository",
        "status": "PASS" if not errors else "FAIL",
        "errors": errors,
        "warnings": warnings,
        "checks": checks,
        "skipped": skipped,
        "github_actions": "NOT_RUN_LOCALLY",
        "deployed_production": "NOT_RUN_LOCALLY",
    }
    output = json.dumps(report, indent=2, ensure_ascii=False)
    print(output)
    if args.report:
        report_path = Path(args.report)
        if not report_path.is_absolute():
            report_path = root / report_path
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(output + "\n", encoding="utf-8")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
