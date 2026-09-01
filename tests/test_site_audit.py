from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.site_audit import SiteAudit


class SiteAuditTests(unittest.TestCase):
    def make_repo(self) -> tuple[tempfile.TemporaryDirectory, Path]:
        temporary = tempfile.TemporaryDirectory()
        root = Path(temporary.name)
        for directory in ("quality", "assets/css", "assets/js", "icons", "data"):
            (root / directory).mkdir(parents=True, exist_ok=True)
        config = {
            "expectedRelease": "215",
            "canonicalOrigin": "https://omsaravanabhava.org",
            "requiredFiles": ["index.html", "404.html", "offline.html", "manifest.json", "service-worker.js", "sitemap.xml", "favicon.svg", "assets/css/osb44.css", "assets/js/pwa-register.js", "icons/icon-192.png", "icons/icon-512.png"],
            "canonicalOptional": ["404.html", "offline.html"],
            "ignoredDirectories": [".git", ".github"], "routeDirectoryFile": "data/site-routes.json"
        }
        (root / "quality/site-audit-config.json").write_text(json.dumps(config), encoding="utf-8")
        (root / "404.html").write_text('<!doctype html><html lang="ta"><head><title>404</title></head><body>இல்லை</body></html>', encoding="utf-8")
        (root / "offline.html").write_text('<!doctype html><html lang="ta"><head><title>Offline</title></head><body>இணையமில்லை</body></html>', encoding="utf-8")
        (root / "favicon.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"/>', encoding="utf-8")
        (root / "assets/css/osb44.css").write_text('body{display:block}', encoding="utf-8")
        (root / "assets/js/pwa-register.js").write_text('void 0;', encoding="utf-8")
        (root / "icons/icon-192.png").write_bytes(b'png')
        (root / "icons/icon-512.png").write_bytes(b'png')
        (root / "manifest.json").write_text(json.dumps({"icons": [{"src": "/icons/icon-192.png"}, {"src": "/icons/icon-512.png"}]}), encoding="utf-8")
        (root / "data/example.json").write_text('[]', encoding="utf-8")
        (root / "data/site-routes.json").write_text(json.dumps({"routes": [{"path": "/", "titleEn": "Home", "category": "Home", "status": "published", "summary": "Home route"}, {"path": "/about.html", "titleEn": "About", "category": "Platform", "status": "published", "summary": "About route"}]}), encoding="utf-8")
        (root / "index.html").write_text('''<!doctype html><html lang="ta"><head><title>Home</title><link rel="canonical" href="https://omsaravanabhava.org/"></head><body>ஓம் <a href="about.html">About</a></body></html>''', encoding="utf-8")
        (root / "about.html").write_text('''<!doctype html><html lang="ta"><head><title>About</title><link rel="canonical" href="https://omsaravanabhava.org/about.html"></head><body>முருகன்</body></html>''', encoding="utf-8")
        (root / "sitemap.xml").write_text('''<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://omsaravanabhava.org/</loc></url><url><loc>https://omsaravanabhava.org/about.html</loc></url></urlset>''', encoding="utf-8")
        (root / "service-worker.js").write_text('''const RELEASE = '215'; const CORE_PRECACHE_URLS = ["/", "/index.html"]; const PRECACHE_URLS = ["/", "/index.html", "/about.html"]; self.addEventListener('install', event => event.waitUntil(caches.open('x').then(cache => cache.addAll(CORE_PRECACHE_URLS)))); const cacheOptionalAssets = async cache => {};''', encoding="utf-8")
        return temporary, root

    def audit(self, root: Path):
        return SiteAudit(root, root / "quality/site-audit-config.json").audit()

    def test_valid_fixture_passes(self):
        temporary, root = self.make_repo()
        self.addCleanup(temporary.cleanup)
        report = self.audit(root)
        self.assertEqual(report["status"], "PASS", report["findings"])

    def test_broken_internal_link_fails(self):
        temporary, root = self.make_repo()
        self.addCleanup(temporary.cleanup)
        (root / "index.html").write_text((root / "index.html").read_text().replace('about.html', 'missing.html'), encoding="utf-8")
        report = self.audit(root)
        self.assertTrue(any(item["code"] == "broken-internal-reference" for item in report["findings"]))
        self.assertEqual(report["status"], "FAIL")

    def test_malformed_json_fails(self):
        temporary, root = self.make_repo()
        self.addCleanup(temporary.cleanup)
        (root / "data/example.json").write_text('{broken', encoding="utf-8")
        report = self.audit(root)
        self.assertTrue(any(item["code"] == "invalid-json" for item in report["findings"]))

    def test_duplicate_canonical_fails(self):
        temporary, root = self.make_repo()
        self.addCleanup(temporary.cleanup)
        about = (root / "about.html").read_text().replace('https://omsaravanabhava.org/about.html', 'https://omsaravanabhava.org/')
        (root / "about.html").write_text(about, encoding="utf-8")
        report = self.audit(root)
        self.assertTrue(any(item["code"] == "duplicate-canonical" for item in report["findings"]))

    def test_missing_precache_target_fails(self):
        temporary, root = self.make_repo()
        self.addCleanup(temporary.cleanup)
        worker = (root / "service-worker.js").read_text().replace('"/about.html"', '"/missing.html"')
        (root / "service-worker.js").write_text(worker, encoding="utf-8")
        report = self.audit(root)
        self.assertTrue(any(item["code"] == "precache-target-missing" for item in report["findings"]))

    def test_route_directory_missing_target_fails(self):
        temporary, root = self.make_repo()
        self.addCleanup(temporary.cleanup)
        payload = json.loads((root / "data/site-routes.json").read_text())
        payload["routes"].append({"path": "/missing.html", "titleEn": "Missing", "category": "Platform", "status": "published", "summary": "Missing route"})
        (root / "data/site-routes.json").write_text(json.dumps(payload), encoding="utf-8")
        report = self.audit(root)
        self.assertTrue(any(item["code"] == "route-directory-target-missing" for item in report["findings"]))

    def test_sitemap_route_must_be_in_directory(self):
        temporary, root = self.make_repo()
        self.addCleanup(temporary.cleanup)
        payload = json.loads((root / "data/site-routes.json").read_text())
        payload["routes"] = [item for item in payload["routes"] if item["path"] != "/about.html"]
        (root / "data/site-routes.json").write_text(json.dumps(payload), encoding="utf-8")
        report = self.audit(root)
        self.assertTrue(any(item["code"] == "sitemap-route-not-in-directory" for item in report["findings"]))


if __name__ == "__main__":
    unittest.main()
