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
  sanitisePracticePlans,
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
}

const registry = JSON.parse(
  fs.readFileSync(
    new URL('../data/personal-data-registry.json', import.meta.url),
    'utf8'
  )
);

test('release, schema and seven datasets are stable', () => {
  assert.equal(RELEASE, 228);
  assert.equal(registry.release, 228);
  assert.equal(BACKUP_SCHEMA, 'osb-personal-data-backup-v1');
  assert.deepEqual(
    registry.datasets.map(item => item.id),
    DATASET_IDS
  );
  assert.equal(DATASET_IDS.length, 7);
  assert.equal(DATASET_IDS.at(-1), 'practicePlans');
});

test('same-origin route validation remains active', () => {
  assert.equal(
    normaliseSameOriginRoute('/literature/a.html'),
    '/literature/a.html'
  );
  assert.equal(
    normaliseSameOriginRoute('https://example.com/a.html'),
    ''
  );
});

test('practice plan backup stores bounded metadata only', () => {
  const plans = sanitisePracticePlans([
    {
      id: 'p1',
      name: 'Morning',
      description: 'Plan',
      sourceCollectionId: 'c1',
      weekdays: [1, 3, 3, 9],
      routes: [
        {
          route: '/literature/a.html',
          content: 'must not be stored'
        },
        {route: '/literature/a.html'},
        {route: 'https://example.com/out.html'}
      ],
      currentIndex: 99,
      checkIns: [
        {
          date: '2026-07-14',
          route: '/literature/a.html',
          selectedText: 'must not be stored'
        }
      ],
      pageBody: 'must not be stored'
    }
  ], 12, 50, 180);

  assert.equal(plans.length, 1);
  assert.deepEqual(plans[0].weekdays, [1, 3]);
  assert.equal(plans[0].routes.length, 1);
  assert.deepEqual(
    Object.keys(plans[0].routes[0]),
    ['route', 'addedAt']
  );
  assert.equal(plans[0].currentIndex, 0);
  assert.equal(plans[0].checkIns.length, 1);
  assert.deepEqual(
    Object.keys(plans[0].checkIns[0]),
    ['date', 'route', 'completedAt']
  );
  assert.equal('pageBody' in plans[0], false);
});

test('inventory and export include only registered keys', () => {
  const storage = new MemoryStorage({
    'osb-devotional-practice-plans-v1': JSON.stringify([
      {id: 'p1', name: 'Plan', routes: [], checkIns: []}
    ]),
    'unregistered-secret': JSON.stringify({secret: true})
  });
  const inventory = buildInventory(registry, storage);
  assert.equal(inventory.totalRecords, 1);

  const backup = createBackup(
    registry,
    ['practicePlans'],
    storage,
    '2026-07-14T10:00:00Z'
  );
  assert.deepEqual(
    Object.keys(backup.datasets),
    ['practicePlans']
  );
  assert.equal('unregistered-secret' in backup.datasets, false);
});

test('backup validation ignores unknown datasets', () => {
  const valid = validateBackup({
    schema: registry.schema,
    release: 228,
    origin: registry.canonicalOrigin,
    datasets: {
      practicePlans: [
        {
          id: 'p1',
          name: 'Plan',
          routes: [{route: '/literature/a.html'}],
          checkIns: []
        }
      ],
      unknown: {secret: true}
    }
  }, registry);

  assert.equal(valid.ok, true);
  assert.deepEqual(
    Object.keys(valid.backup.datasets),
    ['practicePlans']
  );
  assert.equal(valid.warnings.length, 1);
});

test('generic merge keeps newer plan by id', () => {
  const merged = mergeArrayDataset(
    [
      {
        id: 'p1',
        name: 'Old',
        updatedAt: '2026-07-14T09:00:00Z'
      }
    ],
    [
      {
        id: 'p1',
        name: 'New',
        updatedAt: '2026-07-14T10:00:00Z'
      },
      {
        id: 'p2',
        name: 'Second',
        updatedAt: '2026-07-14T08:00:00Z'
      }
    ],
    {
      uniqueBy: 'id',
      timestampField: 'updatedAt',
      maximumItems: 12
    }
  );
  assert.equal(merged.length, 2);
  assert.equal(
    merged.find(item => item.id === 'p1').name,
    'New'
  );
});

test('restore changes only selected registered datasets', () => {
  const storage = new MemoryStorage({
    'osb-devotional-practice-plans-v1': JSON.stringify([
      {
        id: 'p1',
        name: 'Existing',
        routes: [],
        checkIns: [],
        updatedAt: '2026-07-14T09:00:00Z'
      }
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
      practicePlans: [
        {
          id: 'p2',
          name: 'Imported',
          routes: [{route: '/literature/a.html'}],
          checkIns: [],
          updatedAt: '2026-07-14T10:00:00Z'
        }
      ],
      accessibility: {largeText: true}
    }
  }, registry);

  const result = applyValidatedBackup(
    validation,
    registry,
    {
      selectedIds: ['practicePlans'],
      mode: 'merge',
      storage
    }
  );
  assert.equal(result.ok, true);
  assert.equal(
    JSON.parse(
      storage.getItem('osb-devotional-practice-plans-v1')
    ).length,
    2
  );
  assert.equal(
    JSON.parse(
      storage.getItem('osb-accessibility-preferences-v1')
    ).largeText,
    false
  );
  assert.equal(storage.getItem('unregistered-secret'), 'preserve-me');
  assert.equal(
    datasetCount(validation.backup.datasets.accessibility),
    1
  );
});
