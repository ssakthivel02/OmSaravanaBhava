#!/usr/bin/env python3
"""Pack 101: non-destructive repository reachability and Murugan song inventory audit.

Scans the static GitHub Pages repository, builds a local-reference graph, classifies
public routes and assets, inventories Murugan devotional-song candidates, and writes
compact reports plus compressed full artifacts. It never edits or deletes production
content.
"""

from __future__ import annotations

from collections import Counter, defaultdict, deque
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote, urlsplit
import gzip
import hashlib
import json
import re

ROOT = Path('.').resolve()
REPORT_DIR = ROOT / 'reports/pack-101/reachability-song-audit'
ARTIFACT_DIR = ROOT / 'artifacts/pack-101/reachability-song-audit'

TEXT_EXTENSIONS = {
    '.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.json', '.md', '.xml',
    '.webmanifest', '.txt', '.csv', '.yml', '.yaml'
}
PUBLIC_EXTENSIONS = {
    '.html', '.htm', '.css', '.js', '.mjs', '.json', '.xml', '.webmanifest',
    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.mp3', '.m4a',
    '.ogg', '.wav', '.pdf', '.txt', '.csv'
}
AUDIO_EXTENSIONS = {'.mp3', '.m4a', '.ogg', '.wav', '.aac', '.flac'}
EXCLUDED_PARTS = {'.git', 'node_modules', '.venv', 'venv'}
NON_PUBLIC_PREFIXES = (
    '.github/', 'tools/', 'tests/', 'scripts/', 'reports/', 'artifacts/',
    'docs/', 'roadmap/', 'release-evidence/', 'production-evidence/'
)
MAX_TEXT_BYTES = 5 * 1024 * 1024

ENTRYPOINT_CANDIDATES = [
    'index.html', 'platform-hub.html', 'explore.html', 'site-directory.html',
    'thiruppugazh.html', 'audio-library.html', 'devotional-collections.html',
    'temple-encyclopedia.html', 'regional-temple-catalogue.html',
    'ai-search.html', 'search.html', 'sloka-library.html', 'festivals.html',
    'learning-center.html', 'knowledge-graph.html', 'murugan-timeline.html'
]

COLLECTION_PATTERNS = {
    'Thiruppugazh': [r'thiruppugazh', r'tiruppugazh', r'திருப்புகழ்'],
    'Kandar Anubhuti': [r'kandar[-_ ]?anubh', r'kandar[-_ ]?anubooth', r'கந்தர்\s*அனுபூதி'],
    'Kandar Alankaram': [r'kandar[-_ ]?alank', r'கந்தர்\s*அலங்காரம்'],
    'Kandar Andhadhi': [r'kandar[-_ ]?andha', r'கந்தர்\s*அந்தாதி'],
    'Thiruvaguppu': [r'thiru[vw]aguppu', r'திருவகுப்பு'],
    'Kanda Sashti Kavasam': [r'kand[ah]?[-_ ]?sashti[-_ ]?kava', r'skanda[-_ ]?sashti[-_ ]?kava', r'கந்த\s*சஷ்டி\s*கவசம்'],
    'Skanda Guru Kavasam': [r'skanda[-_ ]?guru[-_ ]?kava', r'கந்த\s*குரு\s*கவசம்', r'ஸ்கந்த\s*குரு\s*கவசம்'],
    'Shanmuga Kavasam': [r'shanmuga[-_ ]?kava', r'சண்முக\s*கவசம்'],
    'Vel Maaral': [r'vel[-_ ]?maaral', r'vel[-_ ]?maral', r'வேல்\s*மாறல்'],
    'Vel Mayil Virutham': [r'vel[-_ ]?mayil[-_ ]?viruth', r'வேல்\s*மயில்\s*விருத்தம்'],
    'Subramanya Bhujangam': [r'subramanya[-_ ]?bhujang', r'சுப்ரமண்ய\s*புஜங்கம்'],
    'Thirumurugatruppadai': [r'thirumurugatruppadai', r'thirumurugatrupadai', r'திருமுருகாற்றுப்படை'],
    'Murugan General Songs': [r'murugan[-_ ]?song', r'muruga[-_ ]?song', r'முருகன்\s*பாட'],
}

POPULAR_SONGS = {
    'Kanda Sashti Kavasam': [r'kand[ah]?[-_ ]?sashti[-_ ]?kava', r'கந்த\s*சஷ்டி\s*கவசம்'],
    'Vel Maaral': [r'vel[-_ ]?maaral', r'வேல்\s*மாறல்'],
    'Kanda Guru Kavasam': [r'kand[ah]?[-_ ]?guru[-_ ]?kava', r'கந்த\s*குரு\s*கவசம்'],
    'Muthai Tharu Pathi Thirunagai': [r'muth+ai.*tharu', r'muththaiththaru', r'முத்தைத்தரு'],
    'Kaithala Niraikani': [r'kaithala.*niraikani', r'கைத்தல\s*நிறைகனி'],
    'Aarumuga Mangalathai': [r'aarumuga.*mangala', r'ஆறுமுக.*மங்கள'],
    'Maruthamalai Maamaniye': [r'maruthamalai.*maamani', r'மருதமலை.*மாமணி'],
    'Senthil Andavan': [r'senthil.*andavan', r'செந்தில்.*ஆண்டவன்'],
    'Muruga Muruga Endral': [r'muruga.*muruga.*endral', r'முருகா.*முருகா.*என்றால்'],
    'Kandhan Karunai Purivaan': [r'kandhan.*karunai.*puriv', r'கந்தன்.*கருணை.*புரிவ'],
    'Pazham Neeyappa': [r'pazham.*neeyappa', r'பழம்.*நீயப்பா'],
    'Chinna Chinna Muruga': [r'chinna.*chinna.*muruga', r'சின்ன.*சின்ன.*முருக'],
    'Kundrathile Kumaranukku': [r'kundrathile.*kumaranukku', r'குன்றத்திலே.*குமரனுக்கு'],
    'Saravana Bhava': [r'saravana[-_ ]?bhava', r'சரவண\s*பவ'],
    'Vadivel Muruganukku Arohara': [r'vadivel.*muruganukku.*arohara', r'வடிவேல்.*முருகனுக்கு.*அரோகரா'],
    'Thiruchenduril Por Purindhu': [r'thiruchenduril.*por.*purindhu', r'திருச்செந்தூரில்.*போர்.*புரிந்து'],
    'Palani Malai Vaasa': [r'palani.*malai.*vaasa', r'பழனி.*மலை.*வாச'],
    'Azhagendra Sollukku Muruga': [r'azhagendra.*sollukku.*muruga', r'அழகென்ற.*சொல்லுக்கு.*முருக'],
    'Karpanai Endralum': [r'karpanai.*endralum', r'கற்பனை.*என்றாலும்'],
}

REFERENCE_RE = re.compile(
    r'''(?:href|src|action|poster|data-src|data-href)\s*=\s*["']([^"']+)["']|'''
    r'''url\(\s*["']?([^\)"']+)|'''
    r'''["']((?:/|\.{1,2}/)[^"'\s?#]+\.(?:html?|json|js|mjs|css|xml|webmanifest|png|jpe?g|webp|gif|svg|ico|mp3|m4a|ogg|wav|pdf|txt|csv))(?:[?#][^"']*)?["']''',
    re.IGNORECASE,
)
TAMIL_RE = re.compile(r'[\u0B80-\u0BFF]')


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def is_excluded(path: Path) -> bool:
    return any(part in EXCLUDED_PARTS for part in path.parts)


def read_text(path: Path) -> str | None:
    try:
        if path.stat().st_size > MAX_TEXT_BYTES:
            return None
        return path.read_text(encoding='utf-8', errors='ignore')
    except OSError:
        return None


def strip_target(raw: str) -> str | None:
    raw = raw.strip()
    if not raw or raw.startswith(('#', 'mailto:', 'tel:', 'javascript:', 'data:', '//')):
        return None
    parsed = urlsplit(raw)
    if parsed.scheme or parsed.netloc:
        return None
    return unquote(parsed.path).strip()


def resolve_reference(source: Path, raw: str, existing: set[str]) -> str | None:
    cleaned = strip_target(raw)
    if cleaned is None:
        return None
    if cleaned.startswith('/'):
        target = ROOT / cleaned.lstrip('/')
    else:
        target = source.parent / cleaned
    try:
        target = target.resolve()
        target.relative_to(ROOT)
    except (OSError, ValueError):
        return None

    candidates = [target]
    if cleaned.endswith('/'):
        candidates.append(target / 'index.html')
    if not target.suffix:
        candidates.extend([target.with_suffix('.html'), target / 'index.html'])
    for candidate in candidates:
        try:
            key = rel(candidate)
        except ValueError:
            continue
        if key in existing:
            return key
    return None


def extract_references(text: str) -> list[str]:
    refs: list[str] = []
    for match in REFERENCE_RE.finditer(text):
        for value in match.groups():
            if value:
                refs.append(value.strip())
                break
    return refs


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def write_gzip_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(path, 'wt', encoding='utf-8') as handle:
        json.dump(data, handle, ensure_ascii=False, separators=(',', ':'))


def find_matches(haystack: str, patterns: list[str]) -> bool:
    return any(re.search(pattern, haystack, re.IGNORECASE) for pattern in patterns)


def classify_song(path_key: str, text: str) -> list[str]:
    haystack = f'{path_key}\n{text[:300000]}'
    return [name for name, patterns in COLLECTION_PATTERNS.items() if find_matches(haystack, patterns)]


def metadata_flags(path_key: str, text: str, refs: list[str]) -> dict[str, bool]:
    low = text.lower()
    return {
        'tamil_original': len(TAMIL_RE.findall(text)) >= 20,
        'easy_tamil': any(token in low for token in ('easy tamil', 'simple tamil', 'readable tamil')) or any(token in text for token in ('எளிய தமிழ்', 'படிக்க எளிய', 'சுலபமான தமிழ்')),
        'transliteration': any(token in low for token in ('transliteration', 'romanised', 'romanized')) or 'ஒலிபெயர்ப்பு' in text,
        'meaning_or_translation': any(token in low for token in ('meaning', 'translation', 'explanation', 'commentary')) or any(token in text for token in ('பொருள்', 'விளக்கம்', 'உரை')),
        'audio': Path(path_key).suffix.lower() in AUDIO_EXTENSIONS or any(Path(urlsplit(r).path).suffix.lower() in AUDIO_EXTENSIONS for r in refs),
        'source_or_edition': any(token in low for token in ('source', 'citation', 'edition', 'publisher', 'attributed author')) or any(token in text for token in ('ஆதாரம்', 'பதிப்பு', 'மூலம்')),
        'publication_status': any(token in low for token in ('published', 'review_required', 'review required', 'partial reviewed', 'verified')),
    }


def main() -> None:
    all_paths = [p for p in ROOT.rglob('*') if p.is_file() and not is_excluded(p)]
    file_keys = sorted(rel(p) for p in all_paths)
    existing = set(file_keys)
    path_lookup = {rel(p): p for p in all_paths}

    graph: dict[str, set[str]] = defaultdict(set)
    unresolved: list[dict[str, str]] = []
    inbound = Counter()
    text_cache: dict[str, str] = {}
    raw_refs_cache: dict[str, list[str]] = {}
    registry_targets: set[str] = set()
    sitemap_targets: set[str] = set()
    service_worker_targets: set[str] = set()

    for key in file_keys:
        path = path_lookup[key]
        if path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        text = read_text(path)
        if text is None:
            continue
        text_cache[key] = text
        refs = extract_references(text)
        raw_refs_cache[key] = refs
        for raw in refs:
            target = resolve_reference(path, raw, existing)
            if target:
                graph[key].add(target)
                inbound[target] += 1
                low_key = key.lower()
                if 'route' in low_key and path.suffix.lower() == '.json':
                    registry_targets.add(target)
                if key == 'sitemap.xml' or key.startswith('sitemap'):
                    sitemap_targets.add(target)
                if 'service-worker' in low_key or low_key.endswith('sw.js'):
                    service_worker_targets.add(target)
            elif strip_target(raw) and not urlsplit(raw).scheme:
                unresolved.append({'source': key, 'reference': raw})

    entrypoints = [p for p in ENTRYPOINT_CANDIDATES if p in existing]
    if 'sitemap.xml' in existing:
        entrypoints.append('sitemap.xml')
    entrypoints = sorted(set(entrypoints))

    reachable: set[str] = set(entrypoints)
    queue = deque(entrypoints)
    while queue:
        source = queue.popleft()
        for target in graph.get(source, ()):
            if target not in reachable:
                reachable.add(target)
                queue.append(target)

    public_files = [
        key for key in file_keys
        if Path(key).suffix.lower() in PUBLIC_EXTENSIONS and not key.startswith(NON_PUBLIC_PREFIXES)
    ]
    html_routes = [key for key in public_files if Path(key).suffix.lower() in {'.html', '.htm'}]

    mapped = reachable | registry_targets | sitemap_targets | service_worker_targets
    unmapped_candidates = sorted(key for key in public_files if key not in mapped)
    unreachable_html = sorted(key for key in html_routes if key not in mapped)

    song_records: list[dict[str, object]] = []
    collection_counts = Counter()
    for key in file_keys:
        path = path_lookup[key]
        if path.suffix.lower() not in TEXT_EXTENSIONS | AUDIO_EXTENSIONS:
            continue
        text = text_cache.get(key, '')
        collections = classify_song(key, text)
        if not collections:
            continue
        refs = raw_refs_cache.get(key, [])
        flags = metadata_flags(key, text, refs)
        for collection in collections:
            collection_counts[collection] += 1
        song_records.append({
            'path': key,
            'collections': collections,
            'reachable': key in reachable,
            'registry_mapped': key in registry_targets,
            'sitemap_mapped': key in sitemap_targets,
            'inbound_links': inbound.get(key, 0),
            'flags': flags,
        })

    popular_status: list[dict[str, object]] = []
    combined_candidates = [
        (record['path'], text_cache.get(str(record['path']), ''))
        for record in song_records
    ]
    for title, patterns in POPULAR_SONGS.items():
        matches = []
        for key, text in combined_candidates:
            if find_matches(f'{key}\n{text[:300000]}', patterns):
                matches.append(key)
        popular_status.append({
            'title': title,
            'found': bool(matches),
            'candidate_paths': sorted(matches)[:20],
            'candidate_count': len(matches),
        })

    field_coverage = Counter()
    for record in song_records:
        for flag, present in record['flags'].items():
            if present:
                field_coverage[flag] += 1

    duplicate_groups: dict[str, list[str]] = defaultdict(list)
    for key in public_files:
        path = path_lookup[key]
        try:
            if path.stat().st_size > 10 * 1024 * 1024:
                continue
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
        except OSError:
            continue
        duplicate_groups[digest].append(key)
    duplicate_groups = {d: paths for d, paths in duplicate_groups.items() if len(paths) > 1}
    referenced_duplicate_groups = [
        {'sha256': digest, 'paths': paths, 'mapped_paths': [p for p in paths if p in mapped]}
        for digest, paths in duplicate_groups.items()
        if any(p in mapped for p in paths)
    ]

    summary = {
        'pack': 101,
        'stage': 'full-reachability-and-song-inventory',
        'safety': {'files_deleted': 0, 'production_files_modified': 0},
        'total_files': len(file_keys),
        'public_files': len(public_files),
        'html_routes': len(html_routes),
        'entrypoints': entrypoints,
        'reachable_files': len(reachable),
        'registry_mapped_files': len(registry_targets),
        'sitemap_mapped_files': len(sitemap_targets),
        'service_worker_mapped_files': len(service_worker_targets),
        'unmapped_public_candidates': len(unmapped_candidates),
        'unreachable_html_candidates': len(unreachable_html),
        'unresolved_local_references': len(unresolved),
        'song_candidate_files': len(song_records),
        'song_collection_counts': dict(collection_counts.most_common()),
        'song_field_coverage': dict(field_coverage),
        'popular_song_found_count': sum(1 for row in popular_status if row['found']),
        'popular_song_missing_count': sum(1 for row in popular_status if not row['found']),
        'duplicate_groups_with_mapped_files': len(referenced_duplicate_groups),
    }

    route_hub_plan = {
        'principle': 'Do not link every file directly from index.html.',
        'hierarchy': [
            'index.html',
            'platform-hub.html or site-directory.html',
            'murugan-song-library.html',
            'collection page',
            'song detail page',
            'Tamil original / easy-reading Tamil / transliteration / meaning / audio / source'
        ],
        'recommended_top_level_links': [
            {'label': 'Murugan Song Library', 'target': 'murugan-song-library.html'},
            {'label': 'Thiruppugazh', 'target': 'thiruppugazh.html'},
            {'label': 'Devotional Literature', 'target': 'devotional-collections.html'},
            {'label': 'Audio Library', 'target': 'audio-library.html'},
            {'label': 'Complete Site Directory', 'target': 'site-directory.html'},
        ],
        'collection_counts': dict(collection_counts.most_common()),
    }

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    write_json(REPORT_DIR / 'reachability-summary.json', summary)
    write_json(REPORT_DIR / 'popular-song-coverage.json', popular_status)
    write_json(REPORT_DIR / 'route-hub-plan.json', route_hub_plan)
    write_json(REPORT_DIR / 'unmapped-samples.json', {
        'unmapped_public_sample': unmapped_candidates[:500],
        'unreachable_html_sample': unreachable_html[:500],
        'unresolved_reference_sample': unresolved[:500],
    })
    write_gzip_json(ARTIFACT_DIR / 'full-route-graph.json.gz', {
        'entrypoints': entrypoints,
        'graph': {key: sorted(values) for key, values in graph.items()},
        'reachable': sorted(reachable),
        'registry_targets': sorted(registry_targets),
        'sitemap_targets': sorted(sitemap_targets),
        'service_worker_targets': sorted(service_worker_targets),
        'unmapped_public_candidates': unmapped_candidates,
        'unresolved': unresolved,
    })
    write_gzip_json(ARTIFACT_DIR / 'full-song-inventory.json.gz', song_records)
    write_gzip_json(ARTIFACT_DIR / 'referenced-duplicate-groups.json.gz', referenced_duplicate_groups)

    lines = [
        '# Pack 101 — Full Reachability and Murugan Song Inventory',
        '',
        'This is a non-destructive audit. No production file was deleted or modified.',
        '',
        f'- Total repository files scanned: **{len(file_keys)}**',
        f'- Public-file candidates: **{len(public_files)}**',
        f'- HTML routes: **{len(html_routes)}**',
        f'- Reachable files from principal hubs: **{len(reachable)}**',
        f'- Registry-mapped files: **{len(registry_targets)}**',
        f'- Sitemap-mapped files: **{len(sitemap_targets)}**',
        f'- Unmapped public candidates: **{len(unmapped_candidates)}**',
        f'- Unreachable HTML candidates: **{len(unreachable_html)}**',
        f'- Unresolved local references: **{len(unresolved)}**',
        f'- Murugan song candidate files: **{len(song_records)}**',
        f'- Popular-song entries found: **{summary["popular_song_found_count"]}/{len(POPULAR_SONGS)}**',
        f'- Duplicate groups containing at least one mapped file: **{len(referenced_duplicate_groups)}**',
        '',
        '## Required architecture',
        '',
        '`Home → Platform/Directory Hub → Song Library → Collection → Song Detail`',
        '',
        'A file does not need a direct homepage link to be valid. It must be reachable through a governed hub, route registry, search index, sitemap, or runtime data reference.',
        '',
        '## Next safe action',
        '',
        'Review the unmapped and song-coverage reports, then create links only through collection hubs and the canonical route registry. Do not delete duplicate files until mapped duplicates are separated from genuinely unused copies.',
    ]
    (REPORT_DIR / 'SUMMARY.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
