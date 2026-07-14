#!/usr/bin/env python3
"""Observe the deployed custom domain and fail when Release 227 is not live."""
from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

CHECKS = [
    ("/", 'data-release="227"'),
    ("/service-worker.js", "const RELEASE = '227';"),
    ("/search-facets.html", "Published-Content Search Facets"),
    ("/assets/js/search-facets.mjs", "export const RELEASE = 216;"),
    ("/data/site-routes.json", '"/search-facets.html"'),
    ("/platform.html", 'href="search-facets.html"'),
    ("/sitemap.xml", "https://omsaravanabhava.org/search-facets.html"),
    ("/reading-list.html", "Offline Reading List"),
    ("/assets/js/reading-list.mjs", "export const RELEASE = 216"),
    ("/sitemap.xml", "https://omsaravanabhava.org/reading-list.html"),
    ("/accessibility.html", "Accessibility Centre"),
    ("/assets/js/accessibility-preferences.mjs", "export const RELEASE = 217"),
    ("/assets/js/pwa-register.js", "accessibility-preferences.mjs"),
    ("/sitemap.xml", "https://omsaravanabhava.org/accessibility.html"),
    ("/print-pdf.html", "Print and PDF Support"),
    ("/assets/js/print-support.mjs", "export const RELEASE = 218"),
    ("/assets/js/pwa-register.js", "print-support.mjs"),
    ("/sitemap.xml", "https://omsaravanabhava.org/print-pdf.html"),
    ("/audio-library.html", "data-release=\"219\""),
    ("/audio-library.html", "audio-history.mjs"),
    ("/audio-history.html", "Audio Listening History"),
    ("/assets/js/audio-history.mjs", "export const RELEASE = 219"),
    ("/sitemap.xml", "https://omsaravanabhava.org/audio-history.html"),
    ("/knowledge-graph.html", "knowledge-graph-explorer.html"),
    ("/knowledge-graph-explorer.html", "data-release=\"220\""),
    ("/assets/js/knowledge-graph-explorer.mjs", "export const RELEASE = 220"),
    ("/data/knowledge-graph-explorer.json", "\"release\": 220"),
    ("/sitemap.xml", "https://omsaravanabhava.org/knowledge-graph-explorer.html"),
    ("/maintenance.html", "data-release=\"226\""),
    ("/assets/js/maintenance-centre.mjs", "export const RELEASE = 227"),
    ("/data/maintenance-checks.json", "\"release\": 227"),
    ("/manifest-release-227.json", "\"release\": 227"),
    ("/data/site-routes.json", "\"/maintenance.html\""),
    ("/sitemap.xml", "https://omsaravanabhava.org/maintenance.html"),
    ("/discovery.html", "data-release=\"226\""),
    ("/assets/js/discovery-workspace.mjs", "export const RELEASE = 222"),
    ("/data/discovery-lenses.json", "\"release\": 222"),
    ("/data/site-routes.json", "\"/discovery.html\""),
    ("/sitemap.xml", "https://omsaravanabhava.org/discovery.html"),
    ("/reading-workspace.html", "data-release=\"226\""),
    ("/assets/js/reader-experience.js", "export const RELEASE = 224"),
    ("/assets/js/pwa-register.js", "reader-experience.js"),
    ("/data/reading-workspace.json", "\"release\": 224"),
    ("/data/site-routes.json", "\"/reading-workspace.html\""),
    ("/sitemap.xml", "https://omsaravanabhava.org/reading-workspace.html"),
    ("/reading-notes.html", "data-release=\"226\""),
    ("/assets/js/reading-notes.mjs", "export const RELEASE = 224"),
    ("/assets/js/pwa-register.js", "reading-notes.mjs"),
    ("/data/reading-notes.json", "\"release\": 224"),
    ("/data/site-routes.json", "\"/reading-notes.html\""),
    ("/sitemap.xml", "https://omsaravanabhava.org/reading-notes.html"),
    ("/personal-data.html", "data-release=\"226\""),
    ("/assets/js/personal-data.mjs", "export const RELEASE = 227"),
    ("/data/personal-data-registry.json", "\"release\": 227"),
    ("/manifest-release-225.json", "\"release\": 225"),
    ("/data/site-routes.json", "\"/personal-data.html\""),
    ("/sitemap.xml", "https://omsaravanabhava.org/personal-data.html"),
    ("/personal-library.html", "data-release=\"226\""),
    ("/assets/js/personal-library.mjs", "export const RELEASE = 226"),
    ("/data/personal-library.json", "\"release\": 226"),
    ("/manifest-release-226.json", "\"release\": 226"),
    ("/data/site-routes.json", "\"/personal-library.html\""),
    ("/sitemap.xml", "https://omsaravanabhava.org/personal-library.html"),
    ("/devotional-collections.html", "data-release=\"227\""),
    ("/assets/js/devotional-collections.mjs", "export const RELEASE = 227"),
    ("/data/devotional-collections.json", "\"release\": 227"),
    ("/assets/js/personal-data.mjs", "'collections'"),
    ("/data/personal-data-registry.json", "\"id\": \"collections\""),
    ("/manifest-release-227.json", "\"release\": 227"),
    ("/data/site-routes.json", "\"/devotional-collections.html\""),
    ("/sitemap.xml", "https://omsaravanabhava.org/devotional-collections.html")
]


def fetch(url: str, timeout: int) -> tuple[int, str]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "OmSaravanaBhava-Production-Smoke/227",
            "Cache-Control": "no-cache"
        }
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.status, response.read().decode("utf-8", errors="replace")


def run(origin: str, retries: int, delay: int, timeout: int) -> dict[str, object]:
    last_results: list[dict[str, object]] = []
    for attempt in range(1, retries + 1):
        results = []
        for path, marker in CHECKS:
            url = origin.rstrip("/") + path
            try:
                status, body = fetch(url, timeout)
                ok = 200 <= status < 400 and marker in body
                results.append({"url": url, "status": status, "marker": marker, "ok": ok})
            except (urllib.error.URLError, TimeoutError, OSError) as error:
                results.append({
                    "url": url,
                    "status": None,
                    "marker": marker,
                    "ok": False,
                    "error": str(error)
                })
        last_results = results
        if all(item["ok"] for item in results):
            return {"status": "PASS", "attempt": attempt, "checks": results}
        if attempt < retries:
            time.sleep(delay)
    return {"status": "FAIL", "attempt": retries, "checks": last_results}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--origin", default="https://omsaravanabhava.org")
    parser.add_argument("--retries", type=int, default=18)
    parser.add_argument("--delay", type=int, default=20)
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--report", type=Path, default=Path("artifacts/release-227-production-smoke.json"))
    args = parser.parse_args()
    report = run(args.origin, args.retries, args.delay, args.timeout)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
