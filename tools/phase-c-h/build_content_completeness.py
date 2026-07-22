#!/usr/bin/env python3
"""Phase F: build transparent Murugan content-completeness evidence and research queues.

The script does not generate lyrics or publish unreviewed text. It inventories governed
records, separates source/rights gaps, and creates prompts for external research tools.
"""

from __future__ import annotations

from collections import Counter
from pathlib import Path
import json

ROOT = Path('.').resolve()
DATA_OUT = ROOT / 'data/content-completeness.json'
REPORT = ROOT / 'reports/phase-f-content-completeness'
PROMPTS = ROOT / 'research-prompts'

FORMAT_LABELS = {
    'original_tamil': 'Original Tamil',
    'easy_reading_tamil': 'Easy-reading Tamil',
    'transliteration': 'Transliteration',
    'meaning': 'Meaning',
    'audio': 'Audio or device read-aloud',
    'source': 'Source and edition record',
}


def load_json(relative: str, default):
    path = ROOT / relative
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return default


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main() -> None:
    library = load_json('data/murugan-song-library.json', {})
    collections = library.get('collections', []) if isinstance(library, dict) else []
    thiruppugazh = load_json('data/thiruppugazh.json', [])
    audio = load_json('data/audio-catalog.json', [])
    missing_report = load_json(
        'reports/pack-101/canonical-song-registry/popular-song-canonical-coverage.json',
        []
    )

    collection_rows = []
    total_available = Counter()
    total_missing = Counter()
    for item in collections if isinstance(collections, list) else []:
        available = list(item.get('availableFormats') or [])
        missing = list(item.get('missingFormats') or [])
        total_available.update(available)
        total_missing.update(missing)
        collection_rows.append({
            'id': item.get('id'),
            'titleTa': item.get('titleTa'),
            'titleEn': item.get('titleEn'),
            'route': item.get('route'),
            'publicationStatus': item.get('status'),
            'statusLabel': item.get('statusLabel'),
            'availableFormats': available,
            'missingFormats': missing,
            'completionPercent': round(
                100 * len(available) / max(1, len(available) + len(missing)), 1
            ),
            'nextEvidenceTask': (
                f'Collect and verify {FORMAT_LABELS.get(missing[0], missing[0])}'
                if missing else 'Maintain source and rights evidence'
            )
        })

    canonical_song_rows = []
    song_format_counts = Counter()
    for song in thiruppugazh if isinstance(thiruppugazh, list) else []:
        original = bool(str(song.get('textTa') or '').strip())
        easy = bool(song.get('easyTamil') or song.get('textTaEasy'))
        transliteration = bool(song.get('transliteration'))
        meaning = bool(song.get('meaningTa') or song.get('meaningEn') or song.get('summaryEn'))
        audio_ready = bool(song.get('audio') or song.get('audioUrl'))
        source = bool(song.get('sourceIds'))
        flags = {
            'original_tamil': original,
            'easy_reading_tamil': easy,
            'transliteration': transliteration,
            'meaning': meaning,
            'audio': audio_ready,
            'source': source,
        }
        song_format_counts.update(name for name, present in flags.items() if present)
        canonical_song_rows.append({
            'id': song.get('id'),
            'number': song.get('number'),
            'titleTa': song.get('titleTa'),
            'titleEn': song.get('titleEn'),
            'route': song.get('route'),
            'publicationStatus': song.get('publicationStatus'),
            'formats': flags,
            'missingFormats': [name for name, present in flags.items() if not present],
        })

    audio_rows = []
    audio_status_counts = Counter()
    for item in audio if isinstance(audio, list) else []:
        status = str(item.get('playMode') or 'unknown')
        audio_status_counts[status] += 1
        audio_rows.append({
            'id': item.get('id'),
            'titleTa': item.get('titleTa'),
            'titleEn': item.get('titleEn'),
            'textStatus': item.get('textStatus'),
            'playMode': status,
            'recordingStatus': item.get('recordingStatus'),
            'textRoute': item.get('textRoute'),
            'deviceReadAloudAvailable': (
                status == 'device-tts' and bool(item.get('speechText'))
            )
        })

    missing_popular = [
        {
            'slug': row.get('slug'),
            'titleTa': row.get('titleTa'),
            'titleEn': row.get('titleEn'),
            'task': 'Identify a redistribution-safe source and rights status; do not reconstruct lyrics.'
        }
        for row in missing_report
        if isinstance(row, dict) and not row.get('foundInCanonicalRegistry')
    ]

    priority_tasks = [
        {
            'priority': 1,
            'workstream': 'Canonical source identification',
            'scope': f'{len(missing_popular)} popular requested titles without exact canonical records',
            'publicationRule': 'Metadata and source evidence first; no lyric generation from memory.'
        },
        {
            'priority': 2,
            'workstream': 'Easy-reading Tamil',
            'scope': f'{len(canonical_song_rows) - song_format_counts["easy_reading_tamil"]} canonical Thiruppugazh songs currently lack a reviewed easy-reading field',
            'publicationRule': 'Spacing and punctuation only; preserve canonical text separately.'
        },
        {
            'priority': 3,
            'workstream': 'Transliteration',
            'scope': f'{len(canonical_song_rows) - song_format_counts["transliteration"]} canonical Thiruppugazh songs currently lack transliteration',
            'publicationRule': 'Use one documented system and human review.'
        },
        {
            'priority': 4,
            'workstream': 'Meaning and devotional explanation',
            'scope': 'Separate literal meaning, original site summary and third-party commentary rights.',
            'publicationRule': 'Do not copy modern copyrighted commentary without permission.'
        },
        {
            'priority': 5,
            'workstream': 'Audio rights and synchronisation',
            'scope': f'{audio_status_counts["not-published"]} audio catalogue entries are not published as recordings',
            'publicationRule': 'Owned, licensed or permission-confirmed recording only; otherwise labelled device TTS.'
        },
        {
            'priority': 6,
            'workstream': 'Collection expansion',
            'scope': 'Kandar Anubhuti, Kandar Alangaram, Kandar Andhadhi, Shanmuga Kavasam, Vel Maaral, Vel/Mayil Virutham, Subramanya Bhujangam and the surviving Thiruppugazh corpus.',
            'publicationRule': 'Select a verifiable edition and record source boundaries before transcription.'
        }
    ]

    summary = {
        'release': 246,
        'generated': '2026-07-22',
        'phase': 'F-content-completeness-and-ingestion-governance',
        'safety': {
            'lyricsGeneratedByAudit': 0,
            'unreviewedTextPublished': 0,
            'recordingsPublishedWithoutRights': 0,
        },
        'governedCollections': len(collection_rows),
        'canonicalFullSongRecords': len(canonical_song_rows),
        'audioCatalogueRecords': len(audio_rows),
        'popularSourceRequests': len(missing_popular),
        'collectionFormatAvailability': dict(total_available),
        'collectionFormatGaps': dict(total_missing),
        'canonicalSongFormatCoverage': dict(song_format_counts),
        'audioPlayModeCounts': dict(audio_status_counts),
        'collections': collection_rows,
        'canonicalSongs': canonical_song_rows,
        'audioRecords': audio_rows,
        'missingPopularSongs': missing_popular,
        'priorityResearchTasks': priority_tasks,
        'requiredRecordSchema': '/schemas/murugan-song-record.schema.json'
    }
    write_json(DATA_OUT, summary)

    REPORT.mkdir(parents=True, exist_ok=True)
    report_lines = [
        '# Phase F — Murugan Content Completeness',
        '',
        'No lyrics were generated and no unreviewed text or unlicensed recording was published.',
        '',
        f'- Governed collections: **{len(collection_rows)}**',
        f'- Canonical full-song records: **{len(canonical_song_rows)}**',
        f'- Audio catalogue records: **{len(audio_rows)}**',
        f'- Popular titles requiring source identification: **{len(missing_popular)}**',
        '',
        '## Canonical-song field coverage',
        '',
    ]
    for key in FORMAT_LABELS:
        report_lines.append(
            f'- **{FORMAT_LABELS[key]}:** {song_format_counts[key]}/{len(canonical_song_rows)}'
        )
    report_lines += [
        '',
        '## Publication sequence',
        '',
        'Source → canonical Tamil → easy-reading Tamil → transliteration → meaning → audio rights → human review → route/search/sitemap publication.',
    ]
    (REPORT / 'SUMMARY.md').write_text('\n'.join(report_lines) + '\n', encoding='utf-8')
    write_json(REPORT / 'priority-research-tasks.json', priority_tasks)
    write_json(REPORT / 'missing-popular-source-requests.json', missing_popular)

    PROMPTS.mkdir(parents=True, exist_ok=True)
    prompt_lines = [
        '# Gemini / Manus — Murugan Source Collection Master Prompt',
        '',
        'You are assisting a source-aware Tamil devotional digital library. Research evidence; do not invent, reconstruct or paraphrase missing lyrics from memory.',
        '',
        '## Required output for every requested work or song',
        '',
        'Return one JSON object per item using the field structure below:',
        '',
        '```json',
        '{',
        '  "id": "stable-kebab-case-id",',
        '  "collectionId": "collection-id",',
        '  "titleTa": "canonical Tamil title",',
        '  "titleEn": "English or transliterated title",',
        '  "alternateTitles": [],',
        '  "author": {',
        '    "displayName": "",',
        '    "verificationStatus": "verified | traditional-attribution | disputed | source-required",',
        '    "evidenceNote": ""',
        '  },',
        '  "source": {',
        '    "verificationStatus": "verified-primary | verified-secondary | edition-selection-required | source-required",',
        '    "sourceIds": [],',
        '    "editionTitle": "",',
        '    "publisher": "",',
        '    "publicationYear": null,',
        '    "pageOrSection": "",',
        '    "sourceUrls": [],',
        '    "notes": ""',
        '  },',
        '  "rights": {',
        '    "textRightsStatus": "public-domain | licensed | permission-confirmed | quotation-only | permission-required | unknown",',
        '    "audioRightsStatus": "owned | licensed | permission-confirmed | device-tts-only | permission-required | not-available",',
        '    "rightsEvidence": ""',
        '  },',
        '  "publicationStatus": "source-required",',
        '  "review": {',
        '    "humanReviewRequired": true,',
        '    "editorialStatus": "source-check",',
        '    "reviewedBy": [],',
        '    "reviewedAt": null,',
        '    "notes": ""',
        '  }',
        '}',
        '```',
        '',
        '## Non-negotiable rules',
        '',
        '1. Do not provide lyrics when a redistribution-safe verified source is unavailable.',
        '2. Mark such records `source-required` and explain what evidence is missing.',
        '3. Do not copy modern translations or commentary unless rights are clearly compatible.',
        '4. Keep canonical Tamil and easy-reading Tamil as separate fields.',
        '5. Easy-reading Tamil may change spacing and punctuation only, after human comparison with the canonical source.',
        '6. Audio must include performer, recording owner, licence/permission evidence and allowed usage.',
        '7. Include exact source URLs and page/section references wherever possible.',
        '',
        '## Current priority queue',
        '',
    ]
    for number, row in enumerate(missing_popular, 1):
        prompt_lines.append(
            f'{number}. {row["titleTa"]} — {row["titleEn"]} (`{row["slug"]}`)'
        )
    prompt_lines += [
        '',
        'After the popular-title queue, research the primary-text editions and rights boundaries for Kandar Anubhuti, Kandar Alangaram, Kandar Andhadhi, Shanmuga Kavasam, Vel Maaral, Vel Virutham, Mayil Virutham, Subramanya Bhujangam, Thiruvaguppu and the surviving Thiruppugazh corpus.',
    ]
    (PROMPTS / 'GEMINI-MANUS-MURUGAN-SOURCE-COLLECTION.md').write_text(
        '\n'.join(prompt_lines) + '\n', encoding='utf-8'
    )
    print(json.dumps({
        'collections': len(collection_rows),
        'canonicalSongs': len(canonical_song_rows),
        'sourceRequests': len(missing_popular),
        'safety': summary['safety']
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
