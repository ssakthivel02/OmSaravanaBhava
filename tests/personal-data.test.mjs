import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  RELEASE,
  BACKUP_SCHEMA,
  DATASET_IDS,
  applyValidatedBackup,
  buildInventory,
  createBackup,
  datasetCount,
  mergeArrayDataset,
  normaliseSameOriginRoute,
  sanitiseAccessibility,
  sanitiseAudioHistory,
  sanitiseReadingList,
  sanitiseReadingNotes,
  sanitiseReadingProgress,
  validateBackup
} from '../assets/js/personal-data.mjs';

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
}

const registry = JSON.parse(
  fs.readFileSync(
    new URL('../data/personal-data-registry.json', import.meta.url),
    'utf8'
  )
);

test('release, schema and registered datasets are stable', () => {
  assert.equal(RELEASE, 225);
  assert.equal(registry.release, 225);
  assert.equal(BACKUP_SCHEMA, 'osb-personal-data-backup-v1');
  assert.deepEqual(
    registry.datasets.map(item => item.id),
    DATASET_IDS
  );
});

test('same-origin routes are accepted and external routes rejected', () => {
  assert.equal(
    normaliseSameOriginRoute('/literature/kandar-anubhuti.html'),
    '/literature/kandar-anubhuti.html'
  );
  assert.equal(
    normaliseSameOriginRoute('https://example.com/page.html'),
    ''
  );
});

test('reading list sanitiser deduplicates and excludes external routes', () => {
  const items = sanitiseReadingList([
    {route: '/a.html', titleEn: 'A', savedAt: '2026-07-14T10:00:00Z'},
    {route: '/a.html', titleEn: 'Duplicate'},
    {route: 'https://example.com/b.html', titleEn: 'External'}
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].route, '/a.html');
});

test('reading progress is bounded and source body fields are discarded', () => {
  const items = sanitiseReadingProgress([{
    route: '/literature/a.html',
    titleEn: 'A',
    percent: 150,
    content: 'must not be stored',
    lastVisitedAt: '2026-07-14T10:00:00Z'
  }]);
  assert.equal(items[0].percent, 100);
  assert.equal('content' in items[0], false);
});

test('reading notes discard selected and page text fields', () => {
  const notes = sanitiseReadingNotes([{
    id: 'n1',
    route: '/literature/a.html',
    headingId: 'section-1',
    headingLabel: 'Section 1',
    note: 'My reflection',
    selectedText: 'not allowed',
    pageBody: 'not allowed',
    content: 'not allowed',
    updatedAt: '2026-07-14T10:00:00Z'
  }]);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].note, 'My reflection');
  assert.equal('selectedText' in notes[0], false);
  assert.equal('pageBody' in notes[0], false);
  assert.equal('content' in notes[0], false);
});

test('accessibility and audio history schemas are bounded', () => {
  assert.deepEqual(
    sanitiseAccessibility({
      largeText: true,
      highContrast: 1,
      reducedMotion: true,
      unknown: true
    }),
    {
      largeText: true,
      highContrast: false,
      reducedMotion: true,
      underlinedLinks: false
    }
  );
  const history = sanitiseAudioHistory([{
    id: 'track-1',
    route: '/slokas/a.html',
    playCount: -3
  }]);
  assert.equal(history.length, 1);
  assert.equal(history[0].playCount, 1);
});

test('inventory and export include only registered keys', () => {
  const storage = new MemoryStorage({
    'osb-reading-list-v1': JSON.stringify([
      {route: '/a.html', titleEn: 'A'}
    ]),
    'unregistered-secret': JSON.stringify({secret: true})
  });
  const inventory = buildInventory(registry, storage);
  assert.equal(inventory.totalRecords, 1);
  const backup = createBackup(
    registry,
    ['readingList'],
    storage,
    '2026-07-14T10:00:00Z'
  );
  assert.deepEqual(Object.keys(backup.datasets), ['readingList']);
  assert.equal('unregistered-secret' in backup.datasets, false);
});

test('backup validation rejects wrong schema and ignores unknown datasets', () => {
  const wrong = validateBackup({
    schema: 'wrong',
    origin: registry.canonicalOrigin,
    datasets: {}
  }, registry);
  assert.equal(wrong.ok, false);

  const valid = validateBackup({
    schema: registry.schema,
    release: 225,
    origin: registry.canonicalOrigin,
    exportedAt: '2026-07-14T10:00:00Z',
    datasets: {
      accessibility: {largeText: true},
      unknown: {secret: true}
    }
  }, registry);
  assert.equal(valid.ok, true);
  assert.deepEqual(Object.keys(valid.backup.datasets), ['accessibility']);
  assert.equal(valid.warnings.length, 1);
});

test('merge keeps the newer matching record and applies capacity', () => {
  const merged = mergeArrayDataset(
    [
      {route: '/a.html', savedAt: '2026-07-14T09:00:00Z', titleEn: 'Old'}
    ],
    [
      {route: '/a.html', savedAt: '2026-07-14T10:00:00Z', titleEn: 'New'},
      {route: '/b.html', savedAt: '2026-07-14T08:00:00Z', titleEn: 'B'}
    ],
    {
      uniqueBy: 'route',
      timestampField: 'savedAt',
      maximumItems: 1
    }
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].titleEn, 'New');
});

test('validated merge changes only selected registered datasets', () => {
  const storage = new MemoryStorage({
    'osb-reading-list-v1': JSON.stringify([
      {route: '/a.html', titleEn: 'A', savedAt: '2026-07-14T09:00:00Z'}
    ]),
    'osb-accessibility-preferences-v1': JSON.stringify({
      largeText: false,
      highContrast: false,
      reducedMotion: false,
      underlinedLinks: false
    }),
    'unregistered-secret': 'preserve-me'
  });

  const validation = validateBackup({
    schema: registry.schema,
    origin: registry.canonicalOrigin,
    datasets: {
      readingList: [
        {route: '/b.html', titleEn: 'B', savedAt: '2026-07-14T10:00:00Z'}
      ],
      accessibility: {largeText: true}
    }
  }, registry);

  const result = applyValidatedBackup(
    validation,
    registry,
    {
      selectedIds: ['readingList'],
      mode: 'merge',
      storage
    }
  );
  assert.equal(result.ok, true);
  assert.equal(
    JSON.parse(storage.getItem('osb-reading-list-v1')).length,
    2
  );
  assert.equal(
    JSON.parse(
      storage.getItem('osb-accessibility-preferences-v1')
    ).largeText,
    false
  );
  assert.equal(storage.getItem('unregistered-secret'), 'preserve-me');
  assert.equal(datasetCount(validation.backup.datasets.accessibility), 1);
});
