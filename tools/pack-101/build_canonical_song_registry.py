#!/usr/bin/env python3
"""Build a strict canonical Murugan song registry without changing production content.

Unlike the broad reachability scan, this script does not count release notes, manifests,
checksums or incidental text mentions as songs. It reads governed datasets and verifies
that referenced routes exist.
"""

from __future__ import annotations

from pathlib import Path
import json
import re
import unicodedata

ROOT = Path('.').resolve()
REPORT = ROOT / 'reports/pack-101/canonical-song-registry'

POPULAR = [
    ('kanda-sashti-kavasam', 'கந்த சஷ்டி கவசம்', 'Kanda Sashti Kavasam'),
    ('vel-maaral', 'வேல் மாறல்', 'Vel Maaral'),
    ('kanda-guru-kavasam', 'கந்த குரு கவசம்', 'Kanda Guru Kavasam'),
    ('muthai-tharu-pathi-thirunagai', 'முத்தைத்தரு பத்தித் திருநகை', 'Muthai Tharu Pathi Thirunagai'),
    ('kaithala-niraikani', 'கைத்தல நிறைகனி', 'Kaithala Niraikani'),
    ('aarumuga-mangalathai', 'ஆறுமுக மங்களத்தை', 'Aarumuga Mangalathai'),
    ('maruthamalai-maamaniye', 'மருதமலை மாமணியே', 'Maruthamalai Maamaniye'),
    ('senthil-andavan', 'செந்தில் ஆண்டவன்', 'Senthil Andavan'),
    ('muruga-muruga-endral', 'முருகா முருகா என்றால்', 'Muruga Muruga Endral'),
    ('kandhan-karunai-purivaan', 'கந்தன் கருணை புரிவான்', 'Kandhan Karunai Purivaan'),
    ('pazham-neeyappa', 'பழம் நீயப்பா', 'Pazham Neeyappa'),
    ('chinna-chinna-muruga', 'சின்ன சின்ன முருகா', 'Chinna Chinna Muruga'),
    ('kundrathile-kumaranukku', 'குன்றத்திலே குமரனுக்கு', 'Kundrathile Kumaranukku'),
    ('saravana-bhava', 'சரவண பவ', 'Saravana Bhava'),
    ('vadivel-muruganukku-arohara', 'வடிவேல் முருகனுக்கு அரோகரா', 'Vadivel Muruganukku Arohara'),
    ('thiruchenduril-por-purindhu', 'திருச்செந்தூரில் போர் புரிந்து', 'Thiruchenduril Por Purindhu'),
    ('palani-malai-vaasa', 'பழனி மலை வாசா', 'Palani Malai Vaasa'),
    ('azhagendra-sollukku-muruga', 'அழகென்ற சொல்லுக்கு முருகா', 'Azhagendra Sollukku Muruga'),
    ('karpanai-endralum', 'கற்பனை என்றாலும்', 'Karpanai Endralum'),
]

POPULAR_ALIASES = {
    'kanda-sashti-kavasam': [
        'kanda sashti kavacham', 'skanda sashti kavacham',
        'கந்த சஷ்டி கவசம்', 'கந்தர் சஷ்டி கவசம்'
    ],
    'vel-maaral': ['vel maral', 'vel maaral', 'வேல் மாறல்'],
    'kanda-guru-kavasam': [
        'skanda guru kavasam', 'skanda guru kavacham',
        'ஸ்கந்த குரு கவசம்', 'கந்த குரு கவசம்'
    ],
    'muthai-tharu-pathi-thirunagai': [
        'muththaiththaru', 'muththaiththaru pathi thirunagai',
        'muthai tharu', 'முத்தைத்தரு', 'முத்தைத்தரு பத்தித் திருநகை'
    ],
    'saravana-bhava': [
        'om saravana bhava', 'saravanabhava mantra',
        'ஓம் சரவணபவ', 'சரவணபவ மந்திரம்'
    ],
}

PLACEHOLDER_MARKERS = (
    'placeholder', 'quality-focused', 'feature 1', 'canonical text should be added',
    'needs review', 'starter record', 'generated record'
)


def load_json(relative: str, default):
    path = ROOT / relative
    if not path.is_file():
        return default
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return default


def normalise(value: object) -> str:
    text = unicodedata.normalize('NFKC', str(value or '')).casefold()
    text = re.sub(r'[^0-9a-z\u0b80-\u0bff]+', '', text)
    return text


def route_exists(route: str | None) -> bool:
    if not route:
        return False
    clean = str(route).split('?', 1)[0].split('#', 1)[0].lstrip('/')
    return (ROOT / clean).is_file()


def write_json(name: str, payload) -> None:
    REPORT.mkdir(parents=True, exist_ok=True)
    (REPORT / name).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )


def main() -> None:
    canonical: list[dict] = []
    placeholders: list[dict] = []

    thiruppugazh = load_json('data/thiruppugazh.json', [])
    for row in thiruppugazh if isinstance(thiruppugazh, list) else []:
        status = str(row.get('publicationStatus', ''))
        text = str(row.get('textTa', '')).strip()
        sources = row.get('sourceIds') if isinstance(row.get('sourceIds'), list) else []
        route = str(row.get('route', ''))
        valid = (
            status == 'published-source-linked' and
            len(text) >= 40 and
            bool(sources) and
            route_exists(route)
        )
        record = {
            'recordType': 'song',
            'collection': 'Thiruppugazh',
            'id': str(row.get('id') or row.get('number') or ''),
            'titleTa': str(row.get('titleTa', '')),
            'titleEn': str(row.get('titleEn', '')),
            'author': str(row.get('author', '')),
            'route': route,
            'routeExists': route_exists(route),
            'publicationStatus': status,
            'sourceIds': sources,
            'hasOriginalTamil': len(text) >= 40,
            'hasEasyTamil': bool(row.get('easyTamil') or row.get('textTaEasy')),
            'hasTransliteration': bool(row.get('transliteration')),
            'hasMeaning': bool(row.get('meaningTa') or row.get('meaningEn') or row.get('summaryEn')),
            'hasAudio': bool(row.get('audio') or row.get('audioUrl')),
            'canonical': valid,
        }
        (canonical if valid else placeholders).append(record)

    collections_payload = load_json('data/murugan-song-library.json', {})
    collections = collections_payload.get('collections', []) if isinstance(collections_payload, dict) else []
    for row in collections if isinstance(collections, list) else []:
        route = str(row.get('route', ''))
        canonical.append({
            'recordType': 'collection',
            'collection': str(row.get('titleEn', '')),
            'id': str(row.get('id', '')),
            'titleTa': str(row.get('titleTa', '')),
            'titleEn': str(row.get('titleEn', '')),
            'author': str(row.get('author', '')),
            'route': route,
            'routeExists': route_exists(route),
            'publicationStatus': str(row.get('status', '')),
            'statusLabel': str(row.get('statusLabel', '')),
            'availableFormats': row.get('availableFormats', []),
            'missingFormats': row.get('missingFormats', []),
            'canonical': route_exists(route),
        })

    audio = load_json('data/audio-catalog.json', [])
    for row in audio if isinstance(audio, list) else []:
        text_route = str(row.get('textRoute', ''))
        canonical.append({
            'recordType': 'audio-status',
            'collection': 'Audio Library',
            'id': str(row.get('id', '')),
            'titleTa': str(row.get('titleTa', '')),
            'titleEn': str(row.get('titleEn', '')),
            'route': text_route or 'audio-library.html',
            'routeExists': route_exists(text_route) if text_route else route_exists('audio-library.html'),
            'publicationStatus': str(row.get('textStatus', '')),
            'playMode': str(row.get('playMode', '')),
            'recordingStatus': str(row.get('recordingStatus', '')),
            'hasAudio': row.get('playMode') == 'device-tts' and bool(row.get('speechText')),
            'canonical': True,
        })

    sloka_index = load_json('data/slokas/index.json', [])
    for row in sloka_index if isinstance(sloka_index, list) else []:
        combined = ' '.join(str(row.get(key, '')) for key in ('id', 'titleTa', 'titleEn', 'summary', 'meaningEn', 'status')).casefold()
        if any(marker in combined for marker in PLACEHOLDER_MARKERS):
            placeholders.append({
                'recordType': 'directory-placeholder',
                'source': 'data/slokas/index.json',
                'id': str(row.get('id', '')),
                'titleTa': str(row.get('titleTa', '')),
                'titleEn': str(row.get('titleEn', '')),
                'status': str(row.get('status', '')),
                'reason': 'Placeholder or review-only directory record; not canonical song text.'
            })

    coverage = []
    for slug, title_ta, title_en in POPULAR:
        targets = {normalise(slug), normalise(title_ta), normalise(title_en)}
        targets.update(normalise(alias) for alias in POPULAR_ALIASES.get(slug, []))
        matches = []
        for row in canonical:
            haystack = normalise(' '.join(str(row.get(key, '')) for key in ('id', 'titleTa', 'titleEn', 'collection')))
            if any(target and target in haystack for target in targets):
                matches.append({
                    'recordType': row.get('recordType'),
                    'id': row.get('id'),
                    'titleTa': row.get('titleTa'),
                    'titleEn': row.get('titleEn'),
                    'route': row.get('route'),
                    'publicationStatus': row.get('publicationStatus'),
                })
        coverage.append({
            'slug': slug,
            'titleTa': title_ta,
            'titleEn': title_en,
            'foundInCanonicalRegistry': bool(matches),
            'matches': matches,
        })

    canonical_songs = [row for row in canonical if row.get('recordType') == 'song' and row.get('canonical')]
    collection_records = [row for row in canonical if row.get('recordType') == 'collection']
    audio_records = [row for row in canonical if row.get('recordType') == 'audio-status']
    missing = [row for row in coverage if not row['foundInCanonicalRegistry']]

    summary = {
        'pack': 101,
        'stage': 'strict-canonical-song-registry',
        'safety': {'filesDeleted': 0, 'productionFilesModifiedByAudit': 0},
        'canonicalFullSongRecords': len(canonical_songs),
        'governedCollectionRecords': len(collection_records),
        'audioStatusRecords': len(audio_records),
        'placeholderOrReviewOnlyRecords': len(placeholders),
        'popularSongsFound': len(coverage) - len(missing),
        'popularSongsMissing': len(missing),
        'allCanonicalRoutesExist': all(row.get('routeExists', False) for row in canonical if row.get('route')),
    }

    write_json('SUMMARY.json', summary)
    write_json('canonical-song-registry.json', canonical)
    write_json('placeholder-and-review-only-records.json', placeholders)
    write_json('popular-song-canonical-coverage.json', coverage)

    missing_lines = [
        '# Missing Murugan Song Source Request',
        '',
        'These titles were not found as exact canonical song records in the governed registry. They may exist under alternate spellings or only as incidental mentions. Do not generate or publish lyrics from memory.',
        '',
        '## Requested titles',
        '',
    ]
    for number, row in enumerate(missing, 1):
        missing_lines.append(f'{number}. **{row["titleTa"]} — {row["titleEn"]}** (`{row["slug"]}`)')
    missing_lines += [
        '',
        '## Source-collection prompt for Gemini or Manus',
        '',
        'For each requested title, return metadata and source evidence only. Do not invent lyrics. Provide: canonical Tamil title, alternate spellings, lyricist/composer if reliably established, work/album/film context, earliest verifiable edition or official publication, public-domain or rights status, source URLs, whether full Tamil lyrics may legally be republished, and a confidence label. If a verified redistribution-safe primary text is unavailable, mark the item SOURCE_REQUIRED and do not supply reconstructed lyrics.',
        '',
        'For any supplied Tamil text, preserve the exact source form separately from a proposed easy-reading Tamil version. The easy-reading version may adjust spacing only after human review and must never silently replace the canonical text.',
    ]
    (REPORT / 'MISSING-SONG-SOURCE-REQUEST.md').write_text('\n'.join(missing_lines) + '\n', encoding='utf-8')

    readme = [
        '# Pack 101 — Strict Canonical Murugan Song Registry',
        '',
        '- No production content was deleted or altered by this audit.',
        f'- Canonical full-song records: **{len(canonical_songs)}**',
        f'- Governed collection records: **{len(collection_records)}**',
        f'- Audio-status records: **{len(audio_records)}**',
        f'- Placeholder/review-only records separated: **{len(placeholders)}**',
        f'- Popular-song titles found canonically: **{len(coverage) - len(missing)}/{len(coverage)}**',
        f'- Popular-song titles needing source identification: **{len(missing)}**',
        '',
        'This strict registry intentionally excludes release READMEs, checksums, manifests, generic generated records and incidental mentions.',
    ]
    (REPORT / 'SUMMARY.md').write_text('\n'.join(readme) + '\n', encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
