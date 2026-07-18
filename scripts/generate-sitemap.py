#!/usr/bin/env python3
import json
from pathlib import Path
from xml.sax.saxutils import escape
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'seo/routes.json').read_text())
urls=''.join(f"<url><loc>{escape(data['base_url']+r['path'])}</loc><changefreq>{r['changefreq']}</changefreq><priority>{r['priority']}</priority></url>" for r in data['routes'])
(root/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls+'</urlset>',encoding='utf-8')
print('sitemap.xml generated')
