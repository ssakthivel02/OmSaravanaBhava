import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  RELEASE,
  STORAGE_KEY,
  addRouteToCollection,
  buildCollectionMetrics,
  createCollection,
  deleteCollection,
  filterCollections,
  filterEligibleRoutes,
  loadCollections,
  moveRouteInCollection,
  normaliseCollectionRoute,
  normaliseEligibleRoutes,
  removeRouteFromCollection,
  resolveCollections,
  sanitiseCollection,
  saveCollections,
  updateCollection
} from '../assets/js/devotional-collections.mjs';

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(
      Object.entries(initial)
    );
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

const config = JSON.parse(
  fs.readFileSync(
    new URL(
      '../data/devotional-collections.json',
      import.meta.url
    ),
    'utf8'
  )
);

const routesPayload = {
  release: 227,
  routes: [
    {
      path: '/literature/a.html',
      titleTa: 'அ',
      titleEn: 'Literature A',
      category: 'Literature',
      status: 'published',
      summary: 'Published'
    },
    {
      path: '/temples/a.html',
      titleTa: 'கோவில்',
      titleEn: 'Temple A',
      category: 'Temple',
      status: 'partial-reviewed',
      summary: 'Bounded'
    },
    {
      path: '/personal-data.html',
      titleEn: 'Personal Data',
      category: 'Platform',
      status: 'utility'
    },
    {
      path: '/draft.html',
      titleEn: 'Draft',
      category: 'Literature',
      status: 'draft'
    }
  ]
};

test('release and storage configuration are stable', () => {
  assert.equal(RELEASE, 227);
  assert.equal(config.release, 227);
  assert.equal(
    STORAGE_KEY,
    'osb-devotional-collections-v1'
  );
  assert.equal(config.maximumCollections, 20);
  assert.equal(
    config.maximumRoutesPerCollection,
    50
  );
});

test('same-origin route normalisation rejects external routes', () => {
  assert.equal(
    normaliseCollectionRoute(
      '/literature/a.html'
    ),
    '/literature/a.html'
  );
  assert.equal(
    normaliseCollectionRoute(
      'https://example.com/a.html'
    ),
    ''
  );
});

test('collection sanitiser stores route references only', () => {
  const collection = sanitiseCollection({
    id: 'c1',
    name: 'Morning',
    description: 'Study',
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
        route: 'https://example.com/out.html'
      }
    ],
    selectedText: 'must not be stored',
    pageBody: 'must not be stored'
  }, {
    ...config,
    timestamp: '2026-07-14T11:00:00Z'
  });

  assert.equal(collection.items.length, 1);
  assert.deepEqual(
    Object.keys(collection.items[0]),
    ['route', 'addedAt']
  );
  assert.equal('selectedText' in collection, false);
  assert.equal('pageBody' in collection, false);
});

test('eligible route registry excludes utility and draft pages', () => {
  const routes = normaliseEligibleRoutes(
    routesPayload,
    config
  );
  assert.deepEqual(
    routes.map(route => route.path).sort(),
    [
      '/literature/a.html',
      '/temples/a.html'
    ]
  );
});

test('create, update and delete are bounded', () => {
  let collections = createCollection(
    [],
    {
      id: 'c1',
      name: 'Morning',
      description: 'First',
      timestamp: '2026-07-14T10:00:00Z'
    },
    config
  );
  assert.equal(collections.length, 1);

  collections = updateCollection(
    collections,
    'c1',
    {
      name: 'Updated',
      description: 'Changed'
    },
    config,
    '2026-07-14T11:00:00Z'
  );
  assert.equal(collections[0].name, 'Updated');
  assert.equal(
    collections[0].updatedAt,
    '2026-07-14T11:00:00.000Z'
  );

  collections = deleteCollection(
    collections,
    'c1'
  );
  assert.equal(collections.length, 0);
});

test('route add prevents duplicates and route removal works', () => {
  let collections = createCollection(
    [],
    {
      id: 'c1',
      name: 'Morning',
      timestamp: '2026-07-14T10:00:00Z'
    },
    config
  );

  collections = addRouteToCollection(
    collections,
    'c1',
    '/literature/a.html',
    config,
    '2026-07-14T10:30:00Z'
  );
  collections = addRouteToCollection(
    collections,
    'c1',
    '/literature/a.html',
    config,
    '2026-07-14T10:40:00Z'
  );
  assert.equal(collections[0].items.length, 1);

  collections = removeRouteFromCollection(
    collections,
    'c1',
    '/literature/a.html',
    '2026-07-14T11:00:00Z'
  );
  assert.equal(collections[0].items.length, 0);
});

test('route order can move up and down deterministically', () => {
  let collections = [{
    id: 'c1',
    name: 'Ordered',
    description: '',
    items: [
      {
        route: '/literature/a.html',
        addedAt: '2026-07-14T10:00:00Z'
      },
      {
        route: '/temples/a.html',
        addedAt: '2026-07-14T10:01:00Z'
      }
    ],
    createdAt: '2026-07-14T10:00:00Z',
    updatedAt: '2026-07-14T10:01:00Z'
  }];

  collections = moveRouteInCollection(
    collections,
    'c1',
    '/temples/a.html',
    'up',
    '2026-07-14T11:00:00Z'
  );
  assert.equal(
    collections[0].items[0].route,
    '/temples/a.html'
  );

  collections = moveRouteInCollection(
    collections,
    'c1',
    '/temples/a.html',
    'down',
    '2026-07-14T12:00:00Z'
  );
  assert.equal(
    collections[0].items[1].route,
    '/temples/a.html'
  );
});

test('storage roundtrip applies collection capacity', () => {
  const storage = new MemoryStorage();
  const collections = [];
  for (let index = 0; index < 25; index += 1) {
    collections.push({
      id: `c${index}`,
      name: `Collection ${index}`,
      items: [],
      createdAt:
        `2026-07-14T10:${String(index).padStart(2, '0')}:00Z`,
      updatedAt:
        `2026-07-14T10:${String(index).padStart(2, '0')}:00Z`
    });
  }

  assert.equal(
    saveCollections(
      collections,
      storage,
      config
    ),
    true
  );
  assert.equal(
    loadCollections(storage, config).length,
    20
  );
});

test('resolution reports stale route references and metrics', () => {
  const routes = normaliseEligibleRoutes(
    routesPayload,
    config
  );
  const collections = [{
    id: 'c1',
    name: 'Mixed',
    description: '',
    items: [
      {
        route: '/literature/a.html',
        addedAt: '2026-07-14T10:00:00Z'
      },
      {
        route: '/removed.html',
        addedAt: '2026-07-14T10:01:00Z'
      }
    ],
    createdAt: '2026-07-14T10:00:00Z',
    updatedAt: '2026-07-14T10:01:00Z'
  }];

  const resolved = resolveCollections(
    collections,
    routes
  );
  assert.equal(
    resolved.collections[0].items.length,
    1
  );
  assert.equal(resolved.ignoredRoutes, 1);
  assert.deepEqual(
    buildCollectionMetrics(
      collections,
      routes,
      config
    ),
    {
      collections: 1,
      routes: 1,
      ignoredRoutes: 1,
      maximumCollections: 20,
      maximumRoutesPerCollection: 50
    }
  );
});

test('Tamil and English filtering remains local', () => {
  const routes = normaliseEligibleRoutes(
    routesPayload,
    config
  );
  assert.equal(
    filterEligibleRoutes(
      routes,
      'கோவில்'
    )[0].path,
    '/temples/a.html'
  );

  const resolved = resolveCollections(
    [{
      id: 'c1',
      name: 'காலை',
      description: 'Morning',
      items: [{
        route: '/literature/a.html',
        addedAt: '2026-07-14T10:00:00Z'
      }],
      createdAt: '2026-07-14T10:00:00Z',
      updatedAt: '2026-07-14T10:00:00Z'
    }],
    routes
  ).collections;

  assert.equal(
    filterCollections(
      resolved,
      'காலை'
    ).length,
    1
  );
});

test('module contains no tracking or source-text capture operations', () => {
  const source = fs.readFileSync(
    new URL(
      '../assets/js/devotional-collections.mjs',
      import.meta.url
    ),
    'utf8'
  );
  assert.equal(
    source.includes('navigator.sendBeacon'),
    false
  );
  assert.equal(
    source.includes('document.body.innerText'),
    false
  );
  assert.equal(
    source.includes('document.body.textContent'),
    false
  );
  assert.equal(
    source.includes('selectedText:'),
    false
  );
  assert.equal(
    source.includes('pageBody:'),
    false
  );
});
