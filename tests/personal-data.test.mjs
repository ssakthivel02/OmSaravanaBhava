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
  sanitiseCollections,
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
    return this.values.has(key)
      ? this.values.get(key)
      : null;
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
    new URL(
      '../data/personal-data-registry.json',
      import.meta.url
    ),
    'utf8'
  )
);

test('release, schema and six registered datasets are stable', () => {
  assert.equal(RELEASE, 227);
  assert.equal(registry.release, 227);
  assert.equal(
    BACKUP_SCHEMA,
    'osb-personal-data-backup-v1'
  );
  assert.deepEqual(
    registry.datasets.map(item => item.id),
    DATASET_IDS
  );
  assert.equal(DATASET_IDS.length, 6);
  assert.equal(DATASET_IDS.at(-1), 'collections');
});

test('same-origin routes are accepted and external routes rejected', () => {
  assert.equal(
    normaliseSameOriginRoute(
      '/literature/kandar-anubhuti.html'
    ),
    '/literature/kandar-anubhuti.html'
  );
  assert.equal(
    normaliseSameOriginRoute(
      'https://example.com/page.html'
    ),
    ''
  );
});

test('reading records remain bounded and source body fields are discarded', () => {
  const list = sanitiseReadingList([
    {
      route: '/a.html',
      titleEn: 'A',
      savedAt: '2026-07-14T10:00:00Z'
    },
    {
      route: '/a.html',
      titleEn: 'Duplicate'
    },
    {
      route: 'https://example.com/b.html'
    }
  ]);
  assert.equal(list.length, 1);

  const progress = sanitiseReadingProgress([{
    route: '/literature/a.html',
    percent: 150,
    content: 'must not be stored'
  }]);
  assert.equal(progress[0].percent, 100);
  assert.equal('content' in progress[0], false);

  const notes = sanitiseReadingNotes([{
    id: 'n1',
    route: '/literature/a.html',
    note: 'My reflection',
    selectedText: 'not allowed',
    pageBody: 'not allowed'
  }]);
  assert.equal(notes.length, 1);
  assert.equal('selectedText' in notes[0], false);
  assert.equal('pageBody' in notes[0], false);
});

test('accessibility and audio schemas remain bounded', () => {
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

test('collections store bounded route references only', () => {
  const collections = sanitiseCollections([
    {
      id: 'c1',
      name: 'Morning',
      description: 'Daily routes',
      items: [
        {
          route: '/literature/a.html',
          addedAt: '2026-07-14T10:00:00Z',
          titleEn: 'must not be stored',
          content: 'must not be stored'
        },
        {
          route: '/literature/a.html'
        },
        {
          route: 'https://example.com/outside.html'
        }
      ],
      selectedText: 'must not be stored',
      pageBody: 'must not be stored',
      updatedAt: '2026-07-14T11:00:00Z'
    }
  ], 20, 50);

  assert.equal(collections.length, 1);
  assert.equal(collections[0].items.length, 1);
  assert.deepEqual(
    Object.keys(collections[0].items[0]),
    ['route', 'addedAt']
  );
  assert.equal('selectedText' in collections[0], false);
  assert.equal('pageBody' in collections[0], false);
});

test('inventory and export include only registered keys', () => {
  const storage = new MemoryStorage({
    'osb-devotional-collections-v1':
      JSON.stringify([
        {
          id: 'c1',
          name: 'Morning',
          items: []
        }
      ]),
    'unregistered-secret':
      JSON.stringify({secret: true})
  });

  const inventory = buildInventory(
    registry,
    storage
  );
  assert.equal(inventory.totalRecords, 1);

  const backup = createBackup(
    registry,
    ['collections'],
    storage,
    '2026-07-14T10:00:00Z'
  );
  assert.deepEqual(
    Object.keys(backup.datasets),
    ['collections']
  );
  assert.equal(
    'unregistered-secret' in backup.datasets,
    false
  );
});

test('backup validation ignores unknown datasets and validates collections', () => {
  const wrong = validateBackup({
    schema: 'wrong',
    origin: registry.canonicalOrigin,
    datasets: {}
  }, registry);
  assert.equal(wrong.ok, false);

  const valid = validateBackup({
    schema: registry.schema,
    release: 227,
    origin: registry.canonicalOrigin,
    datasets: {
      collections: [
        {
          id: 'c1',
          name: 'Study',
          items: [
            {route: '/literature/a.html'}
          ]
        }
      ],
      unknown: {secret: true}
    }
  }, registry);

  assert.equal(valid.ok, true);
  assert.deepEqual(
    Object.keys(valid.backup.datasets),
    ['collections']
  );
  assert.equal(valid.warnings.length, 1);
});

test('generic merge keeps newer collection by id', () => {
  const merged = mergeArrayDataset(
    [
      {
        id: 'c1',
        name: 'Old',
        updatedAt: '2026-07-14T09:00:00Z'
      }
    ],
    [
      {
        id: 'c1',
        name: 'New',
        updatedAt: '2026-07-14T10:00:00Z'
      },
      {
        id: 'c2',
        name: 'Second',
        updatedAt: '2026-07-14T08:00:00Z'
      }
    ],
    {
      uniqueBy: 'id',
      timestampField: 'updatedAt',
      maximumItems: 20
    }
  );
  assert.equal(merged.length, 2);
  assert.equal(
    merged.find(item => item.id === 'c1').name,
    'New'
  );
});

test('validated restore changes only selected registered datasets', () => {
  const storage = new MemoryStorage({
    'osb-devotional-collections-v1':
      JSON.stringify([
        {
          id: 'c1',
          name: 'Existing',
          items: [],
          updatedAt: '2026-07-14T09:00:00Z'
        }
      ]),
    'osb-accessibility-preferences-v1':
      JSON.stringify({
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
      collections: [
        {
          id: 'c2',
          name: 'Imported',
          items: [
            {route: '/literature/a.html'}
          ],
          updatedAt: '2026-07-14T10:00:00Z'
        }
      ],
      accessibility: {
        largeText: true
      }
    }
  }, registry);

  const result = applyValidatedBackup(
    validation,
    registry,
    {
      selectedIds: ['collections'],
      mode: 'merge',
      storage
    }
  );

  assert.equal(result.ok, true);
  assert.equal(
    JSON.parse(
      storage.getItem(
        'osb-devotional-collections-v1'
      )
    ).length,
    2
  );
  assert.equal(
    JSON.parse(
      storage.getItem(
        'osb-accessibility-preferences-v1'
      )
    ).largeText,
    false
  );
  assert.equal(
    storage.getItem('unregistered-secret'),
    'preserve-me'
  );
  assert.equal(
    datasetCount(
      validation.backup.datasets.accessibility
    ),
    1
  );
});
