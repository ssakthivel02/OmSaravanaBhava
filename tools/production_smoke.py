#!/usr/bin/env python3
"""Observe the deployed custom domain and fail when Release 216 is not live."""
from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

CHECKS = [
    ("/", 'data-release="216"'),
    ("/service-worker.js", "const RELEASE = '216';"),
    ("/search-facets.html", "Published-Content Search Facets"),
    ("/assets/js/search-facets.mjs", "export const RELEASE = 215;"),
    ("/data/site-routes.json", '"/search-facets.html"'),
    ("/platform.html", 'href="search-facets.html"'),
    ("/sitemap.xml", "https://omsaravanabhava.org/search-facets.html"),
    ("/reading-list.html", "Offline Reading List"),
    ("/assets/js/reading-list.mjs", "export const RELEASE = 216"),
    ("/sitemap.xml", "https://omsaravanabhava.org/reading-list.html")
]


def fetch(url: str, timeout: int) -> tuple[int, str]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "OmSaravanaBhava-Production-Smoke/216",
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
    parser.add_argument("--report", type=Path, default=Path("artifacts/release-215-production-smoke.json"))
    args = parser.parse_args()
    report = run(args.origin, args.retries, args.delay, args.timeout)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
