#!/usr/bin/env python3
"""Phase D-E: classify HTML routes and build deterministic link-recovery evidence.

This program is deliberately non-destructive. It never deletes or edits production
HTML. It classifies every HTML file, analyses local references, and emits only unique,
high-confidence repair suggestions for later controlled application.
"""

from __future__ import annotations

from collections import Counter, defaultdict, deque
from csv import DictWriter
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import gzip
import hashlib
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path('.').resolve()
REPORT = ROOT / 'reports/phase-d-e-route-recovery'
DATA_OUT = ROOT / 'data/route-recovery-summary.json'
ARTIFACT = ROOT / 'artifacts/phase-d-e-route-recovery'

EXCLUDED_PARTS = {'.git', 'node_modules', '.venv', 'venv'}
INTERNAL_PREFIXES = (
    '.github/', 'tools/', 'tests/', 'fixtures/', 'reports/', 'artifacts/',
    'docs/', 'roadmap/', 'release-evidence/', 'production-evidence/'
)
ENTRYPOINTS = {
    'index.html', 'explore.html', 'discovery.html', 'platform-hub.html',
    'site-directory.html', 'murugan-song-library.html', 'thiruppugazh.html',
    'sloka-library.html', 'temples.html', 'festivals.html', 'audio-library.html',
    'ai-search.html', 'knowledge-graph.html', 'murugan-timeline.html',
    'content-completeness.html', 'route-recovery.html'
}
PLACEHOLDER_MARKERS = (
    'quality-focused release', 'quality-focused record', 'feature 1',
    'purpose-built interface', 'starter record', 'placeholder',
    'canonical text should be added', 'generated record',
    'sample content', 'lorem ipsum'
)
RELEASE_FILE_RE = re.compile(r'(^|/)release[-_]?\d+[a-z0-9_-]*\.html$', re.I)
LOCAL_ATTRS = {'href', 'src', 'poster', 'data-src', 'data-href', 'action'}
KNOWN_ALIASES = {
    '/temples/thirupparankundram.html': '/temples/thirupparamkundram.html',
    '/temples/tirupparankundram.html': '/temples/thirupparamkundram.html',
    '/temples/tiruchendur.html': '/temples/thiruchendur.html',
    '/temples/tiruttani.html': '/temples/thiruthani.html',
    '/literature/kandar-alankaram.html': '/literature/kandar-alangaram.html',
    '/literature/kandar-anuboothi.html': '/literature/kandar-anubhuti.html',
    '/literature/kandar-andhathi.html': '/literature/kandar-andhadhi.html',
    '/slokas/kanda-sashti-kavacham.html': '/slokas/kanda-sashti-kavasam.html',
    '/slokas/skanda-guru-kavacham.html': '/slokas/skanda-guru-kavasam.html',
}


class ReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.references: list[tuple[str, str]] = []
        self.title = ''
        self._in_title = False
        self.robots = ''
        self.lang = ''
        self.main_count = 0
        self.h1_count = 0
        self.images = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {str(k).lower(): str(v or '') for k, v in attrs}
        if tag.lower() == 'html':
            self.lang = attr_map.get('lang', '')
        if tag.lower() == 'title':
            self._in_title = True
        if tag.lower() == 'main':
            self.main_count += 1
        if tag.lower() == 'h1':
            self.h1_count += 1
        if tag.lower() == 'img':
            self.images += 1
        if tag.lower() == 'meta' and attr_map.get('name', '').lower() == 'robots':
            self.robots = attr_map.get('content', '')
        for name, value in attrs:
            if name and name.lower() in LOCAL_ATTRS and value:
                self.references.append((name.lower(), value.strip()))

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == 'title':
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def is_excluded(path: Path) -> bool:
    return any(part in EXCLUDED_PARTS for part in path.parts)


def load_json(path: str, default):
    candidate = ROOT / path
    try:
        return json.loads(candidate.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return default


def normalise_route(value: object) -> str:
    raw = str(value or '').strip()
    if not raw:
        return ''
    parsed = urlsplit(raw)
    path = unquote(parsed.path or '')
    if not path:
        return ''
    if not path.startswith('/'):
        path = '/' + path
    path = re.sub(r'/+', '/', path)
    if path == '/index.html':
        return '/'
    return path


def registry_routes() -> dict[str, dict]:
    routes: dict[str, dict] = {}
    historical = load_json('data/site-routes.json', {})
    for record in historical.get('routes', []) if isinstance(historical, dict) else []:
        path = normalise_route(record.get('path'))
        if path:
            routes[path] = dict(record)
    additions = load_json('data/site-routes-additions.json', {})
    for record in additions.get('records', []) if isinstance(additions, dict) else []:
        path = normalise_route(record.get('path'))
        if path and path not in routes:
            routes[path] = dict(record)
    overrides = load_json('data/site-routes-effective-overrides.json', {})
    for record in overrides.get('records', []) if isinstance(overrides, dict) else []:
        path = normalise_route(record.get('path'))
        if path:
            routes[path] = {**routes.get(path, {}), **record, 'path': path}
    return routes


def sitemap_routes() -> set[str]:
    output: set[str] = set()
    for name in ('sitemap.xml', 'sitemap-songs.xml'):
        path = ROOT / name
        if not path.is_file():
            continue
        try:
            root = ET.fromstring(path.read_text(encoding='utf-8', errors='ignore'))
        except (OSError, ET.ParseError):
            continue
        for loc in root.findall('.//{*}loc'):
            output.add(normalise_route(loc.text or ''))
    return {route for route in output if route}


def route_for_file(key: str) -> str:
    if key == 'index.html':
        return '/'
    return '/' + key


def file_for_route(route: str) -> str:
    clean = normalise_route(route)
    return 'index.html' if clean == '/' else clean.lstrip('/')


def visible_text(html: str) -> str:
    text = re.sub(r'<script\b[^>]*>.*?</script>', ' ', html, flags=re.I | re.S)
    text = re.sub(r'<style\b[^>]*>.*?</style>', ' ', text, flags=re.I | re.S)
    text = re.sub(r'<[^>]+>', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def parse_html(path: Path) -> tuple[ReferenceParser, str, str]:
    try:
        raw = path.read_text(encoding='utf-8', errors='ignore')
    except OSError:
        return ReferenceParser(), '', ''
    parser = ReferenceParser()
    try:
        parser.feed(raw)
    except Exception:
        pass
    return parser, raw, visible_text(raw)


def resolve_local(source_key: str, raw: str) -> str:
    raw = raw.strip()
    if not raw or raw.startswith(('#', 'mailto:', 'tel:', 'javascript:', 'data:', '//')):
        return ''
    parsed = urlsplit(raw)
    if parsed.scheme or parsed.netloc:
        return ''
    path = unquote(parsed.path)
    if not path:
        return ''
    source = ROOT / source_key
    target = ROOT / path.lstrip('/') if path.startswith('/') else source.parent / path
    try:
        target = target.resolve()
        target.relative_to(ROOT)
    except (OSError, ValueError):
        return ''
    key = rel(target)
    if path.endswith('/'):
        key = (Path(key) / 'index.html').as_posix()
    elif not Path(key).suffix:
        key = f'{key}.html'
    return key


def unique_repair(
    source_key: str,
    raw: str,
    existing: set[str],
    lower_map: dict[str, list[str]],
) -> tuple[str, str] | None:
    target_key = resolve_local(source_key, raw)
    if not target_key or target_key in existing:
        return None

    route = normalise_route('/' + target_key)
    if route in KNOWN_ALIASES:
        candidate = file_for_route(KNOWN_ALIASES[route])
        if candidate in existing:
            return candidate, 'known-canonical-alias'

    candidates: list[tuple[str, str]] = []
    if target_key.endswith('.html.html'):
        candidates.append((target_key[:-5], 'duplicate-html-extension'))
    if target_key.endswith('.htm.html'):
        candidates.append((target_key[:-5], 'duplicate-html-extension'))
    if not Path(target_key).suffix:
        candidates.append((f'{target_key}.html', 'missing-html-extension'))
    if target_key.endswith('/index.html'):
        candidates.append((target_key[:-10] + '.html', 'directory-to-html'))
    else:
        stem = str(Path(target_key).with_suffix(''))
        candidates.append((f'{stem}/index.html', 'html-to-directory-index'))

    lower_matches = lower_map.get(target_key.lower(), [])
    if len(lower_matches) == 1:
        candidates.append((lower_matches[0], 'case-normalisation'))

    valid = []
    seen = set()
    for candidate, reason in candidates:
        candidate = candidate.lstrip('/')
        if candidate in existing and candidate not in seen:
            seen.add(candidate)
            valid.append((candidate, reason))
    return valid[0] if len(valid) == 1 else None


def classify(
    key: str,
    parser: ReferenceParser,
    raw: str,
    text: str,
    canonical_routes: set[str],
    sitemap: set[str],
) -> tuple[str, list[str]]:
    route = route_for_file(key)
    low = f'{key}\n{parser.title}\n{text[:2000]}'.lower()
    reasons: list[str] = []

    if key.startswith(INTERNAL_PREFIXES):
        return 'internal-evidence', ['internal path prefix']
    if route in canonical_routes or route in sitemap or key in ENTRYPOINTS:
        reasons.append('governed registry, sitemap or principal entrypoint')
        return 'canonical-public', reasons
    if key.endswith('.html.html') or '.html.html/' in key:
        return 'duplicate-name-candidate', ['duplicate .html extension']
    if 'noindex' in parser.robots.lower() or 'source-register' in low:
        return 'source-register-or-bounded', ['noindex or explicit source-register boundary']
    if RELEASE_FILE_RE.search(key):
        return 'release-showcase', ['release-numbered presentation route']
    if any(marker in low for marker in PLACEHOLDER_MARKERS):
        return 'placeholder-or-generated', ['generic placeholder marker']
    if len(text) < 180:
        return 'placeholder-or-generated', ['very small visible-text payload']
    if parser.main_count == 0 or parser.h1_count == 0:
        return 'orphan-quality-review', ['missing semantic main or h1']
    return 'orphan-content-candidate', ['substantive HTML not yet governed']


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main() -> None:
    routes = registry_routes()
    canonical_routes = set(routes)
    sitemap = sitemap_routes()
    html_paths = [
        path for path in ROOT.rglob('*.html')
        if path.is_file() and not is_excluded(path)
    ]
    html_keys = sorted(rel(path) for path in html_paths)
    all_files = [
        path for path in ROOT.rglob('*')
        if path.is_file() and not is_excluded(path)
    ]
    existing = {rel(path) for path in all_files}
    lower_map: dict[str, list[str]] = defaultdict(list)
    for key in existing:
        lower_map[key.lower()].append(key)

    classifications: list[dict[str, object]] = []
    class_counts = Counter()
    inbound = Counter()
    graph: dict[str, set[str]] = defaultdict(set)
    unresolved: list[dict[str, str]] = []
    safe_repairs: list[dict[str, str]] = []

    parsed_cache: dict[str, tuple[ReferenceParser, str, str]] = {}
    for path in html_paths:
        key = rel(path)
        parser, raw, text = parse_html(path)
        parsed_cache[key] = (parser, raw, text)
        category, reasons = classify(
            key, parser, raw, text, canonical_routes, sitemap
        )
        class_counts[category] += 1
        classifications.append({
            'path': key,
            'route': route_for_file(key),
            'classification': category,
            'reasons': reasons,
            'title': parser.title.strip(),
            'robots': parser.robots,
            'lang': parser.lang,
            'visibleTextCharacters': len(text),
            'mainCount': parser.main_count,
            'h1Count': parser.h1_count,
            'imageCount': parser.images,
            'registered': route_for_file(key) in canonical_routes,
            'inSitemap': route_for_file(key) in sitemap,
        })

        for attribute, reference in parser.references:
            target = resolve_local(key, reference)
            if target and target in existing:
                graph[key].add(target)
                inbound[target] += 1
                continue
            if not target:
                continue
            unresolved.append({
                'source': key,
                'attribute': attribute,
                'reference': reference,
                'resolvedCandidate': target,
                'sourceClassification': category,
            })
            repair = unique_repair(key, reference, existing, lower_map)
            if repair:
                candidate, reason = repair
                safe_repairs.append({
                    'source': key,
                    'attribute': attribute,
                    'reference': reference,
                    'replacement': candidate,
                    'reason': reason,
                    'sourceClassification': category,
                })

    principal = {
        key for key in html_keys
        if key in ENTRYPOINTS or route_for_file(key) in canonical_routes
    }
    reachable: set[str] = set(principal)
    queue = deque(principal)
    while queue:
        source = queue.popleft()
        for target in graph.get(source, set()):
            if target not in reachable:
                reachable.add(target)
                queue.append(target)

    for record in classifications:
        key = str(record['path'])
        record['inboundLinks'] = inbound.get(key, 0)
        record['reachableFromGovernedEntry'] = key in reachable

    canonical_unresolved = [
        row for row in unresolved
        if row['sourceClassification'] == 'canonical-public'
    ]
    canonical_safe_repairs = [
        row for row in safe_repairs
        if row['sourceClassification'] == 'canonical-public'
    ]

    aliases: dict[str, dict[str, str]] = {}
    for row in canonical_safe_repairs:
        old_key = resolve_local(row['source'], row['reference'])
        if not old_key:
            continue
        old_route = normalise_route('/' + old_key)
        new_route = normalise_route('/' + row['replacement'])
        if old_route and new_route and old_route != new_route:
            aliases[old_route] = {
                'target': new_route,
                'reason': row['reason'],
                'evidenceSource': row['source'],
            }
    for old_route, new_route in KNOWN_ALIASES.items():
        target = file_for_route(new_route)
        if target in existing:
            aliases.setdefault(old_route, {
                'target': new_route,
                'reason': 'known-canonical-alias',
                'evidenceSource': 'Phase E controlled alias map',
            })

    summary = {
        'release': 246,
        'generated': '2026-07-22',
        'phaseD': 'route-classification',
        'phaseE': 'deterministic-link-recovery',
        'safety': {
            'filesDeleted': 0,
            'productionHtmlModified': 0,
            'automaticMassReplacement': false,
        },
        'htmlFilesScanned': len(html_keys),
        'effectiveRegistryRoutes': len(canonical_routes),
        'sitemapRoutes': len(sitemap),
        'reachableHtmlAndAssets': len(reachable),
        'classificationCounts': dict(class_counts.most_common()),
        'unresolvedLocalReferences': len(unresolved),
        'unresolvedReferencesFromCanonicalPages': len(canonical_unresolved),
        'uniqueSafeRepairSuggestions': len(safe_repairs),
        'uniqueSafeRepairsOnCanonicalPages': len(canonical_safe_repairs),
        'runtimeAliasCount': len(aliases),
        'nextControlledAction': 'Review and apply canonical safe repairs in small batches; never bulk-delete orphan or duplicate candidates.',
        'classificationDefinitions': {
            'canonical-public': 'Governed route, sitemap route or principal entrypoint.',
            'source-register-or-bounded': 'Source/coverage page or bounded publication, often intentionally noindex.',
            'release-showcase': 'Release-numbered feature presentation; not automatically canonical devotional content.',
            'placeholder-or-generated': 'Generic, small or generated content requiring editorial review.',
            'duplicate-name-candidate': 'Filename anomaly only; preserve until references and canonical target are confirmed.',
            'orphan-quality-review': 'Substantive file missing semantic page structure.',
            'orphan-content-candidate': 'Substantive ungoverned HTML that may deserve route registration or consolidation.',
            'internal-evidence': 'Tooling, test, report or release evidence not intended for devotee navigation.'
        }
    }

    write_json(DATA_OUT, summary)
    write_json(ROOT / 'data/route-aliases.json', {
        'release': 246,
        'generated': '2026-07-22',
        'strategy': 'exact-path-client-side-aliases-only',
        'recordCount': len(aliases),
        'records': [
            {'path': path, **value}
            for path, value in sorted(aliases.items())
        ],
        'limitations': [
            'Aliases are exact path mappings and never fuzzy content redirects.',
            'A redirect is allowed only when the target file exists.',
            'The alias registry does not delete the original repository file.'
        ]
    })

    REPORT.mkdir(parents=True, exist_ok=True)
    ARTIFACT.mkdir(parents=True, exist_ok=True)
    with gzip.open(ARTIFACT / 'route-classification.json.gz', 'wt', encoding='utf-8') as handle:
        json.dump(classifications, handle, ensure_ascii=False, separators=(',', ':'))
    with gzip.open(ARTIFACT / 'all-unresolved-references.json.gz', 'wt', encoding='utf-8') as handle:
        json.dump(unresolved, handle, ensure_ascii=False, separators=(',', ':'))

    with (REPORT / 'canonical-unresolved-links.csv').open('w', encoding='utf-8', newline='') as handle:
        writer = DictWriter(handle, fieldnames=[
            'source', 'attribute', 'reference', 'resolvedCandidate',
            'sourceClassification'
        ])
        writer.writeheader()
        writer.writerows(canonical_unresolved[:2000])

    with (REPORT / 'canonical-safe-repair-suggestions.csv').open('w', encoding='utf-8', newline='') as handle:
        writer = DictWriter(handle, fieldnames=[
            'source', 'attribute', 'reference', 'replacement', 'reason',
            'sourceClassification'
        ])
        writer.writeheader()
        writer.writerows(canonical_safe_repairs[:2000])

    top_orphans = [
        row for row in classifications
        if row['classification'] in {
            'orphan-content-candidate', 'orphan-quality-review'
        }
    ]
    top_orphans.sort(
        key=lambda row: (
            -int(row.get('inboundLinks', 0)),
            -int(row.get('visibleTextCharacters', 0)),
            str(row.get('path', ''))
        )
    )
    write_json(REPORT / 'top-orphan-review-candidates.json', top_orphans[:500])

    markdown = [
        '# Phase D-E Route Recovery Summary',
        '',
        'This audit is non-destructive. It did not delete or edit production HTML.',
        '',
        f'- HTML files scanned: **{len(html_keys)}**',
        f'- Effective governed routes: **{len(canonical_routes)}**',
        f'- Unresolved local references: **{len(unresolved)}**',
        f'- Unresolved references from canonical pages: **{len(canonical_unresolved)}**',
        f'- Unique safe repair suggestions on canonical pages: **{len(canonical_safe_repairs)}**',
        f'- Exact runtime aliases: **{len(aliases)}**',
        '',
        '## Classification counts',
        '',
    ]
    for name, count in class_counts.most_common():
        markdown.append(f'- **{name}:** {count}')
    markdown += [
        '',
        '## Safety boundary',
        '',
        '- Release evidence and generated files are not promoted as devotional content.',
        '- Duplicate-name candidates are preserved until inbound references and canonical targets are verified.',
        '- Only unique, existing-target repairs are reported as safe suggestions.',
        '- Link changes must be applied in small reviewed batches.',
    ]
    (REPORT / 'SUMMARY.md').write_text('\n'.join(markdown) + '\n', encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
