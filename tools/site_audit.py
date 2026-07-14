#!/usr/bin/env python3
"""Repository-wide static integrity gate for OmSaravanaBhava.

Uses only Python's standard library. The command writes machine-readable JSON and
human-readable Markdown evidence and exits non-zero when blocking defects exist.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass, asdict
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.parse import unquote, urlsplit

TAMIL_RE = re.compile(r"[\u0B80-\u0BFF]")
URL_ATTRS = {"href", "src", "poster"}
SKIP_SCHEMES = {"http", "https", "mailto", "tel", "data", "javascript"}
SW_STRING_RE = re.compile(r"[\"'](/[^\"']*)[\"']")
CSS_URL_RE = re.compile(r"url\(\s*(['\"]?)([^)'\"]+)\1\s*\)", re.I)


@dataclass(frozen=True)
class Finding:
    severity: str
    code: str
    path: str
    message: str


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.doctype = False
        self.html_lang = ""
        self.has_html = False
        self.has_head = False
        self.has_body = False
        self.in_title = False
        self.title_parts: list[str] = []
        self.canonicals: list[str] = []
        self.references: list[str] = []
        self.robots = ""

    @property
    def title(self) -> str:
        return " ".join("".join(self.title_parts).split())

    def handle_decl(self, decl: str) -> None:
        if decl.lower().strip() == "doctype html":
            self.doctype = True

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key.lower(): value or "" for key, value in attrs}
        tag = tag.lower()
        if tag == "html":
            self.has_html = True
            self.html_lang = attr_map.get("lang", "").strip().lower()
        elif tag == "head":
            self.has_head = True
        elif tag == "body":
            self.has_body = True
        elif tag == "title":
            self.in_title = True
        elif tag == "link" and attr_map.get("rel", "").lower() == "canonical":
            self.canonicals.append(attr_map.get("href", "").strip())
        elif tag == "meta" and attr_map.get("name", "").lower() == "robots":
            self.robots = attr_map.get("content", "").lower()
        for name in URL_ATTRS:
            if attr_map.get(name):
                self.references.append(attr_map[name].strip())
        if attr_map.get("srcset"):
            for candidate in attr_map["srcset"].split(","):
                value = candidate.strip().split(" ", 1)[0]
                if value:
                    self.references.append(value)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)


class SiteAudit:
    def __init__(self, root: Path, config_path: Path) -> None:
        self.root = root.resolve()
        self.config = json.loads(config_path.read_text(encoding="utf-8"))
        self.findings: list[Finding] = []
        self.pages: dict[Path, PageParser] = {}
        self.canonicals: dict[str, list[str]] = {}
        self.ignored = set(self.config.get("ignoredDirectories", []))

    def add(self, severity: str, code: str, path: Path | str, message: str) -> None:
        relative = str(path) if isinstance(path, str) else self.display(path)
        self.findings.append(Finding(severity, code, relative, message))

    def display(self, path: Path) -> str:
        try:
            return path.resolve().relative_to(self.root).as_posix()
        except ValueError:
            return path.as_posix()

    def files(self, suffix: str | None = None) -> Iterable[Path]:
        for path in self.root.rglob("*"):
            if not path.is_file():
                continue
            relative = path.relative_to(self.root)
            if any(part in self.ignored for part in relative.parts):
                continue
            if suffix is None or path.suffix.lower() == suffix:
                yield path

    def audit(self) -> dict[str, object]:
        self.check_required_files()
        self.check_json()
        self.check_html()
        self.check_internal_references()
        self.check_css_assets()
        self.check_sitemap()
        self.check_manifest()
        self.check_service_worker()
        self.check_route_directory()
        counts = Counter(item.severity for item in self.findings)
        return {
            "release": self.config.get("expectedRelease"),
            "root": str(self.root),
            "status": "FAIL" if counts["error"] else "PASS",
            "summary": {
                "errors": counts["error"],
                "warnings": counts["warning"],
                "htmlFiles": len(self.pages),
                "jsonFiles": sum(1 for _ in self.files(".json"))
            },
            "findings": [asdict(item) for item in sorted(self.findings, key=lambda x: (x.severity, x.path, x.code))]
        }

    def check_required_files(self) -> None:
        for relative in self.config.get("requiredFiles", []):
            if not (self.root / relative).is_file():
                self.add("error", "required-file-missing", relative, "Mandatory production file is missing.")

    def check_json(self) -> None:
        for path in self.files(".json"):
            try:
                json.loads(path.read_text(encoding="utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as error:
                self.add("error", "invalid-json", path, str(error))

    def check_html(self) -> None:
        canonical_optional = set(self.config.get("canonicalOptional", []))
        canonical_origin = self.config.get("canonicalOrigin", "").rstrip("/")
        for path in self.files(".html"):
            try:
                text = path.read_text(encoding="utf-8")
                parser = PageParser()
                parser.feed(text)
                parser.close()
            except (UnicodeDecodeError, Exception) as error:
                self.add("error", "html-parse-failed", path, str(error))
                continue
            self.pages[path] = parser
            relative = self.display(path)
            if not parser.doctype:
                self.add("error", "missing-doctype", path, "Expected <!doctype html>.")
            if not parser.has_html or not parser.has_head or not parser.has_body:
                self.add("error", "html-structure", path, "Page must contain html, head and body elements.")
            if not parser.title:
                self.add("error", "missing-title", path, "Page has no non-empty title.")
            if not parser.html_lang:
                self.add("error", "missing-root-language", path, "The html element has no lang attribute.")
            elif TAMIL_RE.search(text) and parser.html_lang not in {"ta", "ta-in"}:
                self.add("error", "tamil-language-mismatch", path, f"Tamil content uses root language {parser.html_lang!r}.")
            if relative not in canonical_optional:
                if len(parser.canonicals) != 1:
                    self.add("error", "canonical-count", path, f"Expected one canonical URL; found {len(parser.canonicals)}.")
                elif not parser.canonicals[0].startswith(canonical_origin + "/") and parser.canonicals[0] != canonical_origin:
                    self.add("error", "canonical-origin", path, f"Canonical must use {canonical_origin}.")
            for canonical in parser.canonicals:
                if canonical:
                    self.canonicals.setdefault(canonical, []).append(relative)
        for canonical, paths in self.canonicals.items():
            if len(paths) > 1:
                self.add("error", "duplicate-canonical", ", ".join(paths), f"Canonical {canonical} is used by multiple pages.")

    def resolve_local(self, source: Path, reference: str) -> Path | None:
        reference = reference.strip()
        if not reference or reference.startswith("#") or reference.startswith("//"):
            return None
        parsed = urlsplit(reference)
        if parsed.scheme.lower() in SKIP_SCHEMES or parsed.netloc:
            return None
        raw_path = unquote(parsed.path)
        if not raw_path:
            return None
        if raw_path.startswith("/"):
            target = self.root / raw_path.lstrip("/")
        else:
            target = source.parent / raw_path
        if raw_path.endswith("/") or target.is_dir():
            target = target / "index.html"
        return target.resolve()

    def check_internal_references(self) -> None:
        for page, parser in self.pages.items():
            for reference in parser.references:
                target = self.resolve_local(page, reference)
                if target is not None and not target.is_file():
                    self.add("error", "broken-internal-reference", page, f"{reference} resolves to missing {self.display(target)}.")

    def check_css_assets(self) -> None:
        for stylesheet in self.files(".css"):
            try:
                text = stylesheet.read_text(encoding="utf-8")
            except UnicodeDecodeError as error:
                self.add("error", "css-decode-failed", stylesheet, str(error))
                continue
            for _, reference in CSS_URL_RE.findall(text):
                target = self.resolve_local(stylesheet, reference)
                if target is not None and not target.is_file():
                    self.add("error", "broken-css-asset", stylesheet, f"{reference} resolves to missing {self.display(target)}.")

    def check_sitemap(self) -> None:
        sitemap = self.root / "sitemap.xml"
        if not sitemap.is_file():
            return
        try:
            tree = ET.parse(sitemap)
        except ET.ParseError as error:
            self.add("error", "invalid-sitemap", sitemap, str(error))
            return
        namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        locations = [node.text.strip() for node in tree.findall(".//sm:loc", namespace) if node.text and node.text.strip()]
        for value, count in Counter(locations).items():
            if count > 1:
                self.add("error", "duplicate-sitemap-url", sitemap, value)
        origin = self.config.get("canonicalOrigin", "").rstrip("/")
        local_routes: set[str] = set()
        for location in locations:
            if not location.startswith(origin):
                self.add("error", "sitemap-origin", sitemap, f"Unexpected origin: {location}")
                continue
            path = urlsplit(location).path
            local_routes.add(path)
            target = self.root / (path.lstrip("/") or "index.html")
            if path.endswith("/") and path != "/":
                target = target / "index.html"
            if not target.is_file():
                self.add("error", "sitemap-target-missing", sitemap, f"{location} maps to missing {self.display(target)}.")
        for page in self.pages:
            relative = self.display(page)
            if relative in set(self.config.get("canonicalOptional", [])) or "noindex" in self.pages[page].robots:
                continue
            route = "/" if relative == "index.html" else "/" + relative
            if route not in local_routes:
                self.add("warning", "page-not-in-sitemap", page, "Indexable HTML page is absent from sitemap.xml.")

    def check_manifest(self) -> None:
        manifest = self.root / "manifest.json"
        if not manifest.is_file():
            return
        try:
            payload = json.loads(manifest.read_text(encoding="utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return
        for icon in payload.get("icons", []):
            source = icon.get("src") if isinstance(icon, dict) else None
            if source:
                target = self.resolve_local(manifest, source)
                if target is not None and not target.is_file():
                    self.add("error", "manifest-icon-missing", manifest, f"{source} resolves to missing {self.display(target)}.")

    def check_service_worker(self) -> None:
        worker = self.root / "service-worker.js"
        if not worker.is_file():
            return
        text = worker.read_text(encoding="utf-8")
        expected = str(self.config.get("expectedRelease", ""))
        if not re.search(rf"const\s+RELEASE\s*=\s*['\"]{re.escape(expected)}['\"]", text):
            self.add("error", "service-worker-release", worker, f"Expected RELEASE {expected}.")
        if re.search(r"cache\.addAll\(\s*PRECACHE_URLS\s*\)", text):
            self.add("error", "atomic-complete-precache", worker, "Complete optional precache must not be installed atomically.")
        urls = SW_STRING_RE.findall(text[text.find("const PRECACHE_URLS"):text.find("const cacheOptionalAssets")])
        for value, count in Counter(urls).items():
            if count > 1:
                self.add("error", "duplicate-precache-url", worker, value)
        for url in urls:
            target = self.root / (url.lstrip("/") or "index.html")
            if not target.is_file():
                self.add("error", "precache-target-missing", worker, f"{url} maps to missing {self.display(target)}.")

    def check_route_directory(self) -> None:
        relative = self.config.get("routeDirectoryFile")
        if not relative:
            return
        directory = self.root / relative
        if not directory.is_file():
            self.add("error", "route-directory-missing", relative, "Configured route directory is missing.")
            return
        try:
            payload = json.loads(directory.read_text(encoding="utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return
        records = payload.get("routes") if isinstance(payload, dict) else None
        if not isinstance(records, list):
            self.add("error", "route-directory-shape", directory, "Expected an object containing a routes array.")
            return
        paths: list[str] = []
        for index, record in enumerate(records):
            if not isinstance(record, dict):
                self.add("error", "route-directory-record", directory, f"Record {index} is not an object.")
                continue
            route = record.get("path")
            if not isinstance(route, str) or not route.startswith("/"):
                self.add("error", "route-directory-path", directory, f"Record {index} has an invalid path.")
                continue
            paths.append(route)
            for field in ("titleEn", "category", "status", "summary"):
                if not isinstance(record.get(field), str) or not record[field].strip():
                    self.add("error", "route-directory-field", directory, f"{route} has no valid {field}.")
            target = self.root / (route.lstrip("/") or "index.html")
            if not target.is_file():
                self.add("error", "route-directory-target-missing", directory, f"{route} maps to missing {self.display(target)}.")
        for value, count in Counter(paths).items():
            if count > 1:
                self.add("error", "duplicate-route-directory-path", directory, value)
        sitemap = self.root / "sitemap.xml"
        if sitemap.is_file():
            try:
                tree = ET.parse(sitemap)
                namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
                origin = self.config.get("canonicalOrigin", "").rstrip("/")
                sitemap_paths = {urlsplit(node.text.strip()).path for node in tree.findall(".//sm:loc", namespace) if node.text and node.text.strip().startswith(origin)}
                missing = sorted(sitemap_paths - set(paths))
                for route in missing:
                    self.add("error", "sitemap-route-not-in-directory", directory, route)
            except ET.ParseError:
                pass


def write_markdown(report: dict[str, object], path: Path) -> None:
    summary = report["summary"]
    lines = [
        f"# Static Site Integrity — Release {report['release']}",
        "",
        f"- Status: **{report['status']}**",
        f"- Errors: **{summary['errors']}**",
        f"- Warnings: **{summary['warnings']}**",
        f"- HTML files scanned: **{summary['htmlFiles']}**",
        f"- JSON files scanned: **{summary['jsonFiles']}**",
        "",
        "## Findings",
        ""
    ]
    findings = report["findings"]
    if findings:
        lines.extend(f"- **{item['severity'].upper()} · {item['code']} · {item['path']}** — {item['message']}" for item in findings)
    else:
        lines.append("No findings.")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--config", type=Path, default=Path("quality/site-audit-config.json"))
    parser.add_argument("--json-report", type=Path, default=Path("artifacts/site-audit.json"))
    parser.add_argument("--markdown-report", type=Path, default=Path("artifacts/site-audit.md"))
    args = parser.parse_args(argv)
    root = args.root.resolve()
    config = args.config if args.config.is_absolute() else root / args.config
    audit = SiteAudit(root, config)
    report = audit.audit()
    json_report = args.json_report if args.json_report.is_absolute() else root / args.json_report
    markdown_report = args.markdown_report if args.markdown_report.is_absolute() else root / args.markdown_report
    json_report.parent.mkdir(parents=True, exist_ok=True)
    markdown_report.parent.mkdir(parents=True, exist_ok=True)
    json_report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_markdown(report, markdown_report)
    print(json.dumps(report["summary"], indent=2))
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    sys.exit(main())
