import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  RELEASE,
  buildStatusCounts,
  buildRouteMap,
  evaluateBoundary,
  applyPublicationBoundaries,
  filterBoundaryRecords,
  summariseAudit,
  normaliseRoute
} from '../assets/js/content-status-audit.mjs';
import {
  RELEASE as WORKSPACE_RELEASE,
  PUBLICATION_BOUNDARIES_PATH,
  buildPublicationBoundaryMap,
  applyPublicationBoundaries as applyWorkspaceBoundaries
} from '../assets/js/reading-workspace-desktop.mjs';

const readJson = async relative =>
  JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'));

test('release identities are stable', () => {
  assert.equal(RELEASE, 230);
  assert.equal(WORKSPACE_RELEASE, 230);
  assert.equal(
    PUBLICATION_BOUNDARIES_PATH,
    '/data/publication-boundaries.json'
  );
});

test('boundary registry contains eight unique audited routes', async () => {
  const payload = await readJson('../data/publication-boundaries.json');
  assert.equal(payload.release, 230);
  assert.equal(payload.records.length, 8);
  const routes = payload.records.map(record => record.route);
  assert.equal(new Set(routes).size, routes.length);
  assert.ok(routes.every(route => route.startsWith('/literature/')));
});

test('seven source-only or navigation routes are reading excluded', async () => {
  const payload = await readJson('../data/publication-boundaries.json');
  const excluded = payload.records.filter(
    record => record.readingEligible === false
  );
  assert.equal(excluded.length, 7);
  assert.deepEqual(
    [...new Set(excluded.map(record => record.verifiedStatus))].sort(),
    ['navigation', 'source-register']
  );
});

test('Kandar Anubhuti remains bounded-reading eligible', async () => {
  const payload = await readJson('../data/publication-boundaries.json');
  const record = payload.records.find(
    item => item.route === '/literature/kandar-anubhuti.html'
  );
  assert.equal(record.verifiedStatus, 'partial-reviewed');
  assert.equal(record.fullTextPublished, false);
  assert.equal(record.readingEligible, true);
});

test('reading workspace config excludes every non-reading audit route', async () => {
  const boundaries = await readJson('../data/publication-boundaries.json');
  const config = await readJson('../data/reading-workspace.json');
  assert.equal(config.release, 230);
  const excluded = new Set(config.excludedPaths);
  boundaries.records
    .filter(record => record.readingEligible === false)
    .forEach(record => assert.ok(excluded.has(record.route)));
});

test('status counts are runtime-derived and deterministic', () => {
  const counts = buildStatusCounts({
    routes: [
      {status: 'published'},
      {status: 'published'},
      {status: 'source-register'},
      {}
    ]
  });
  assert.deepEqual(counts, [
    {status: 'published', count: 2},
    {status: 'source-register', count: 1},
    {status: 'unspecified', count: 1}
  ]);
});

test('boundary evaluation exposes registry mismatch without hiding it', () => {
  const record = {
    route: '/literature/example.html',
    declaredRouteStatus: 'published',
    verifiedStatus: 'source-register',
    readingEligible: false
  };
  const result = evaluateBoundary(record, {
    path: record.route,
    status: 'published'
  });
  assert.equal(result.declaredMatchesSnapshot, true);
  assert.equal(result.aligned, false);
  assert.equal(result.mismatch, true);
  assert.equal(result.readingExcluded, true);
});

test('publication overlay changes labels and removes source-only routes', () => {
  const routes = [
    {path: '/literature/a.html', status: 'published'},
    {path: '/literature/b.html', status: 'published'},
    {path: '/literature/c.html', status: 'published'}
  ];
  const payload = {
    records: [
      {
        route: '/literature/a.html',
        verifiedStatus: 'partial-reviewed',
        readingEligible: true
      },
      {
        route: '/literature/b.html',
        verifiedStatus: 'source-register',
        readingEligible: false
      }
    ]
  };
  assert.deepEqual(applyPublicationBoundaries(routes, payload), [
    {
      path: '/literature/a.html',
      status: 'partial-reviewed',
      publicationBoundary: payload.records[0]
    },
    {path: '/literature/c.html', status: 'published'}
  ]);
  assert.deepEqual(
    applyWorkspaceBoundaries(routes, payload),
    applyPublicationBoundaries(routes, payload)
  );
  assert.equal(buildPublicationBoundaryMap(payload).size, 2);
});

test('audit filtering supports mismatch, reading exclusion and Tamil search', () => {
  const records = [
    {
      titleTa: 'கந்தர் அனுபூதி',
      titleEn: 'Kandar Anubhuti',
      mismatch: true,
      aligned: false,
      readingExcluded: false
    },
    {
      titleTa: 'வேல் மாறல்',
      titleEn: 'Vel Maaral',
      mismatch: true,
      aligned: false,
      readingExcluded: true
    }
  ];
  assert.equal(
    filterBoundaryRecords(records, {state: 'reading-excluded'}).length,
    1
  );
  assert.equal(
    filterBoundaryRecords(records, {query: 'கந்தர்'}).length,
    1
  );
});

test('summary uses current route count and audited results', () => {
  const evaluated = [
    {mismatch: true, aligned: false, readingExcluded: true},
    {mismatch: false, aligned: true, readingExcluded: false}
  ];
  assert.deepEqual(
    summariseAudit({routes: [{}, {}, {}]}, evaluated),
    {
      routes: 3,
      audited: 2,
      mismatches: 1,
      aligned: 1,
      excluded: 1
    }
  );
});

test('route normalisation rejects external origins', () => {
  assert.equal(
    normaliseRoute('https://omsaravanabhava.org/literature/a.html'),
    '/literature/a.html'
  );
  assert.equal(normaliseRoute('https://example.com/a'), '');
});

test('content status configuration contains no hard-coded current counts', async () => {
  const config = await readJson('../data/content-status.json');
  assert.equal(config.release, 230);
  assert.equal(config.mode, 'runtime-derived');
  assert.equal(config.hardCodedStatusCounts, false);
  assert.equal('statusCounts' in config, false);
});

test('page is semantic, accessible and release identified', async () => {
  const html = await readFile(
    new URL('../content-status.html', import.meta.url),
    'utf8'
  );
  for (const marker of [
    'data-release="230"',
    'id="contentStatusMessage"',
    'role="status"',
    'aria-live="polite"',
    'id="contentStatusAudit"',
    'assets/js/content-status-audit.mjs',
    'assets/css/content-status-audit.css'
  ]) {
    assert.ok(html.includes(marker), `missing ${marker}`);
  }
});

test('new modules create no storage, analytics or content fabrication surface', async () => {
  const source = [
    await readFile(
      new URL('../assets/js/content-status-audit.mjs', import.meta.url),
      'utf8'
    ),
    await readFile(
      new URL('../assets/js/reading-workspace-desktop.mjs', import.meta.url),
      'utf8'
    )
  ].join('\n');
  for (const forbidden of [
    'localStorage.setItem',
    'sessionStorage.setItem',
    'indexedDB.open',
    'navigator.sendBeacon',
    'gtag(',
    'mixpanel',
    'generateVerse',
    'completeText: true'
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
