#!/usr/bin/env python3
"""Release 231 package and repository validator."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

RELEASE = 231
BASE_COMMIT = '2cec1d02d81aa3251da131667fabd4d24a98147a'
TITLE = 'Release 231: propagate canonical publication statuses'
REQUIRED = [
    'content-status.html',
    'discovery.html',
    'site-directory.html',
    'data/content-status.json',
    'data/publication-boundaries.json',
    'assets/css/route-status-reconciliation.css',
    'assets/js/content-status-audit.mjs',
    'assets/js/route-status-reconciliation.js',
    'service-worker.js',
    'tests/route-status-reconciliation.test.mjs',
    'tools/release_231_validate.py',
    '.github/workflows/release-231-integrity.yml',
    '.github/workflows/release-231-production-smoke.yml',
    'manifest-release-231.json',
    'RELEASE_231_CHANGED_FILES.txt',
    'RELEASE_231_GITHUB_PORTAL_INSTRUCTIONS.txt',
    'RELEASE_231_LOCAL_TEST_EVIDENCE.txt',
    'RELEASE_231_VALIDATION_REPORT.md',
    'RELEASE_231.patch',
]
PRECACHE = [
    '/assets/css/route-status-reconciliation.css',
    '/assets/js/route-status-reconciliation.js',
    '/manifest-release-231.json',
]
CONSUMERS = {
    'content-status.html': 'assets/js/content-status-audit.mjs',
    'discovery.html': 'assets/js/discovery-workspace.mjs',
    'site-directory.html': 'assets/js/site-directory.js',
}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.lang = ''
        self.h1 = 0
        self.main = 0
        self.ids: list[str] = []
        self.status_regions = 0

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == 'html':
            self.lang = values.get('lang', '')
        if tag == 'h1':
            self.h1 += 1
        if tag == 'main':
            self.main += 1
        if values.get('id'):
            self.ids.append(values['id'])
        if values.get('role') == 'status':
            self.status_regions += 1


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def load_json(root: Path, relative: str):
    return json.loads((root / relative).read_text(encoding='utf-8'))


def run(command: list[str], root: Path) -> tuple[int, str]:
    result = subprocess.run(
        command,
        cwd=root,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    return result.returncode, result.stdout


def validate_boundaries(root, errors, checks):
    payload = load_json(root, 'data/publication-boundaries.json')
    records = payload.get('records', [])
    if payload.get('release') != RELEASE:
        errors.append('publication boundary release mismatch')
    if payload.get('baseCommit') != BASE_COMMIT:
        errors.append('publication boundary base commit mismatch')
    if len(records) != 8:
        errors.append(f'expected 8 boundary records, found {len(records)}')
    routes = [str(item.get('route', '')) for item in records]
    if len(routes) != len(set(routes)):
        errors.append('duplicate publication boundary routes')
    if any(not route.startswith('/literature/') for route in routes):
        errors.append('boundary route outside /literature/')
    if sum(item.get('readingEligible') is False for item in records) != 7:
        errors.append('expected exactly 7 reading-ineligible records')
    propagation = payload.get('propagation', {})
    if propagation.get('consumerRoutes') != [
        '/content-status.html', '/discovery.html', '/site-directory.html'
    ]:
        errors.append('publication consumer list mismatch')
    if propagation.get('historicalRouteLabelsPreserved') is not True:
        errors.append('historical route-label preservation not declared')
    checks.append('eight-record canonical boundary and propagation contract')


def validate_content_status(root, errors, checks):
    config = load_json(root, 'data/content-status.json')
    if config.get('release') != RELEASE:
        errors.append('content status release mismatch')
    if config.get('mode') != 'runtime-derived-effective':
        errors.append('content status mode must be runtime-derived-effective')
    if 'statusCounts' in config:
        errors.append('hard-coded statusCounts must not be restored')
    if config.get('historicalRouteRegistryPreserved') is not True:
        errors.append('content status historical-registry boundary missing')
    module = (root / 'assets/js/content-status-audit.mjs').read_text(
        encoding='utf-8'
    )
    if 'export const RELEASE = 231;' not in module:
        errors.append('content status module release mismatch')
    checks.append('effective Content Status configuration and module identity')


def validate_pages(root, errors, checks):
    policy = 'assets/js/route-status-reconciliation.js'
    css = 'assets/css/route-status-reconciliation.css'
    for relative, consumer in CONSUMERS.items():
        text = (root / relative).read_text(encoding='utf-8')
        parser = PageParser()
        parser.feed(text)
        if parser.lang != 'ta':
            errors.append(f'{relative}: html lang is not ta')
        if parser.h1 != 1:
            errors.append(f'{relative}: expected one h1, found {parser.h1}')
        if parser.main != 1:
            errors.append(f'{relative}: expected one main, found {parser.main}')
        duplicates = sorted({value for value in parser.ids if parser.ids.count(value) > 1})
        if duplicates:
            errors.append(f'{relative}: duplicate ids {duplicates}')
        if 'data-release="231"' not in text:
            errors.append(f'{relative}: Release 231 body identity missing')
        if css not in text:
            errors.append(f'{relative}: reconciliation CSS missing')
        policy_index = text.find(policy)
        consumer_index = text.find(consumer)
        if policy_index < 0 or consumer_index <= policy_index:
            errors.append(f'{relative}: policy script must precede {consumer}')
    checks.append('consumer semantics and synchronous reconciliation order')


def validate_script(root, errors, checks):
    source = (root / 'assets/js/route-status-reconciliation.js').read_text(
        encoding='utf-8'
    )
    for marker in (
        'const RELEASE = 231;',
        'applyCanonicalStatuses',
        'shouldReconcileRequest',
        'publicationStatusCanonical',
        'historicalRegistryPreserved: true',
        'route-status-reconciled',
    ):
        if marker not in source:
            errors.append(f'reconciliation script marker missing: {marker}')
    for forbidden in (
        'localStorage.setItem',
        'sessionStorage.setItem',
        'indexedDB.open',
        'navigator.sendBeacon',
        'innerHTML =',
    ):
        if forbidden in source:
            errors.append(f'reconciliation script forbidden operation: {forbidden}')
    css = (root / 'assets/css/route-status-reconciliation.css').read_text(
        encoding='utf-8'
    )
    for marker in (
        '.route-status-reconciled',
        'data-route-status-policy="fallback"',
        '@media (prefers-reduced-motion: reduce)',
        '@media print',
    ):
        if marker not in css:
            errors.append(f'reconciliation CSS marker missing: {marker}')
    checks.append('narrow fetch overlay, visible provenance and safe fallback')


def validate_service_worker(root, errors, checks):
    source = (root / 'service-worker.js').read_text(encoding='utf-8')
    if "const RELEASE = '228';" not in source:
        errors.append('service-worker cache generation changed unexpectedly')
    for asset in PRECACHE:
        count = source.count(f'"{asset}"')
        if count != 1:
            errors.append(f'precache {asset} count is {count}')
    checks.append('additive precache without cache or data migration')


def validate_manifest(root, errors, checks):
    manifest = load_json(root, 'manifest-release-231.json')
    expected = {
        'release': RELEASE,
        'base_commit': BASE_COMMIT,
        'required_commit_title': TITLE,
    }
    for key, value in expected.items():
        if manifest.get(key) != value:
            errors.append(f'manifest {key} mismatch')
    if manifest.get('deleted_files') != []:
        errors.append('manifest declares deleted files')
    if manifest.get('new_browser_storage_key') is not False:
        errors.append('manifest must declare no new browser storage key')
    if manifest.get('route_registry_changed') is not False:
        errors.append('manifest unexpectedly changes physical route registry')
    checks.append('manifest identity, strategy and limitations')


def validate_repository_snapshot(root, errors, warnings, checks):
    route_file = root / 'data/site-routes.json'
    if not route_file.exists():
        warnings.append('site-routes.json unavailable for repository snapshot check')
        return
    routes = load_json(root, 'data/site-routes.json').get('routes', [])
    route_map = {
        str(item.get('path', '')): item
        for item in routes if isinstance(item, dict)
    }
    boundaries = load_json(root, 'data/publication-boundaries.json')
    drift = []
    for record in boundaries['records']:
        actual = route_map.get(record['route'], {}).get('status')
        if actual != record.get('declaredRouteStatus'):
            drift.append({
                'route': record['route'],
                'expectedHistorical': record.get('declaredRouteStatus'),
                'actual': actual,
            })
    if drift:
        errors.append(f'historical route snapshot drift: {drift}')
    checks.append('historical route registry remains covered by the boundary overlay')


def validate_checksums(root, errors, checks):
    ledger = root / 'RELEASE_231_SHA256SUMS.txt'
    if not ledger.exists():
        return
    for line in ledger.read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        expected, relative = line.split('  ', 1)
        target = root / relative
        if not target.exists():
            errors.append(f'checksum target missing: {relative}')
        elif sha256(target) != expected:
            errors.append(f'checksum mismatch: {relative}')
    checks.append('final SHA256 ledger')


def scan_production(root, errors, checks):
    scope = [
        'content-status.html', 'discovery.html', 'site-directory.html',
        'data/content-status.json', 'data/publication-boundaries.json',
        'assets/css/route-status-reconciliation.css',
        'assets/js/content-status-audit.mjs',
        'assets/js/route-status-reconciliation.js',
        'service-worker.js', 'manifest-release-231.json',
    ]
    forbidden = [
        'BEGIN PRIVATE KEY', 'localhost:', '127.0.0.1:',
        'google-analytics', 'segment.io',
    ]
    for relative in scope:
        text = (root / relative).read_text(
            encoding='utf-8', errors='replace'
        ).lower()
        for marker in forbidden:
            if marker.lower() in text:
                errors.append(f'forbidden production marker {marker!r}: {relative}')
    checks.append('production credential, localhost and analytics marker scan')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='.')
    parser.add_argument('--package-mode', action='store_true')
    parser.add_argument('--report')
    args = parser.parse_args()
    root = Path(args.root).resolve()

    errors: list[str] = []
    warnings: list[str] = []
    checks: list[str] = []
    skipped: list[str] = []

    for relative in REQUIRED:
        if not (root / relative).exists():
            errors.append(f'required file missing: {relative}')
    checks.append('required release files')

    for path in root.rglob('*.json'):
        if '.git' in path.parts:
            continue
        try:
            json.loads(path.read_text(encoding='utf-8'))
        except Exception as exc:
            errors.append(f'invalid JSON {path.relative_to(root)}: {exc}')
    checks.append('JSON syntax')

    validate_boundaries(root, errors, checks)
    validate_content_status(root, errors, checks)
    validate_pages(root, errors, checks)
    validate_script(root, errors, checks)
    validate_service_worker(root, errors, checks)
    validate_manifest(root, errors, checks)
    validate_checksums(root, errors, checks)
    scan_production(root, errors, checks)

    node_available = subprocess.run(
        ['bash', '-lc', 'command -v node >/dev/null 2>&1'],
        cwd=root,
        check=False,
    ).returncode == 0
    if node_available:
        commands = [
            ['node', '--check', 'assets/js/route-status-reconciliation.js'],
            ['node', '--check', 'assets/js/content-status-audit.mjs'],
            ['node', '--check', 'service-worker.js'],
            ['node', '--test', 'tests/route-status-reconciliation.test.mjs'],
        ]
        for command in commands:
            code, output = run(command, root)
            if code:
                errors.append(f"{' '.join(command)} failed:\n{output}")
        checks.append('Node syntax and Release 231 tests')
    else:
        skipped.append('Node syntax/tests unavailable')

    if args.package_mode:
        skipped.extend([
            'historical route-registry snapshot check',
            'real browser fetch interception',
            'same-origin deployed page evidence',
            'GitHub Actions conclusion',
            'deployed-production verification',
        ])
    else:
        validate_repository_snapshot(root, errors, warnings, checks)

    report = {
        'release': RELEASE,
        'base_commit': BASE_COMMIT,
        'mode': 'package' if args.package_mode else 'repository',
        'status': 'PASS' if not errors else 'FAIL',
        'errors': errors,
        'warnings': warnings,
        'checks': checks,
        'skipped': skipped,
        'github_actions': 'NOT_RUN_LOCALLY',
        'deployed_production': 'NOT_RUN_LOCALLY',
    }
    output = json.dumps(report, indent=2, ensure_ascii=False)
    print(output)
    if args.report:
        target = Path(args.report)
        if not target.is_absolute():
            target = root / target
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(output + '\n', encoding='utf-8')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
