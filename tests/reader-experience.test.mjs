import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  RELEASE,
  STORAGE_KEY,
  buildWorkspaceMetrics,
  calculateProgress,
  filterWorkspaceRoutes,
  loadProgress,
  mergeRoutesWithProgress,
  normaliseEligibleRoutes,
  normaliseReadingRoute,
  progressToScrollY,
  routeIsEligible,
  saveProgress,
  sanitiseProgressRecord,
  upsertProgress
} from '../assets/js/reader-experience.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
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
    new URL('../data/reading-workspace.json', import.meta.url),
    'utf8'
  )
);

const routePayload = {
  release: 223,
  routes: [
    {
      path: '/literature/kandar-anubhuti.html',
      titleTa: 'கந்தர் அனுபூதி',
      titleEn: 'Kandar Anubhuti',
      category: 'Literature',
      status: 'published',
      summary: 'Published literature route'
    },
    {
      path: '/slokas/kanda-sashti-kavasam.html',
      titleTa: 'கந்த சஷ்டி கவசம்',
      titleEn: 'Kanda Sashti Kavasam',
      category: 'Sloka',
      status: 'partial-reviewed',
      summary: 'Bounded route'
    },
    {
      path: '/literature/draft.html',
      titleEn: 'Draft',
      category: 'Literature',
      status: 'draft',
      summary: 'Excluded'
    },
    {
      path: '/temples.html',
      titleEn: 'Temples',
      category: 'Temple',
      status: 'published',
      summary: 'Not a reading route'
    }
  ]
};

test('release and storage identities are stable', () => {
  assert.equal(RELEASE, 223);
  assert.equal(config.release, 223);
  assert.equal(STORAGE_KEY, 'osb-reading-progress-v1');
  assert.equal(config.maximumProgressItems, 50);
});

test('same-origin route normalisation rejects external URLs', () => {
  assert.equal(
    normaliseReadingRoute('literature/kandar-anubhuti.html'),
    '/literature/kandar-anubhuti.html'
  );
  assert.equal(
    normaliseReadingRoute('https://example.com/page.html'),
    ''
  );
});

test('eligible routes require allowed status and configured path', () => {
  assert.equal(routeIsEligible(routePayload.routes[0], config), true);
  assert.equal(routeIsEligible(routePayload.routes[1], config), true);
  assert.equal(routeIsEligible(routePayload.routes[2], config), false);
  assert.equal(routeIsEligible(routePayload.routes[3], config), false);
});

test('eligible route normalisation excludes drafts and unrelated pages', () => {
  const routes = normaliseEligibleRoutes(
    routePayload,
    config
  );
  assert.deepEqual(
    routes.map(route => route.path).sort(),
    [
      '/literature/kandar-anubhuti.html',
      '/slokas/kanda-sashti-kavasam.html'
    ]
  );
});

test('progress calculation and restoration are bounded', () => {
  assert.equal(calculateProgress(0, 2000, 1000), 0);
  assert.equal(calculateProgress(500, 2000, 1000), 50);
  assert.equal(calculateProgress(2000, 2000, 1000), 100);
  assert.equal(calculateProgress(0, 500, 1000), 100);
  assert.equal(progressToScrollY(50, 2000, 1000), 500);
  assert.equal(progressToScrollY(120, 2000, 1000), 1000);
});

test('progress storage keeps no devotional text field', () => {
  const item = sanitiseProgressRecord({
    route: '/literature/kandar-anubhuti.html',
    titleEn: 'Kandar Anubhuti',
    category: 'Literature',
    status: 'published',
    percent: 42,
    content: 'This must not be stored'
  }, '2026-07-14T10:00:00Z');
  assert.equal(item.percent, 42);
  assert.equal('content' in item, false);
});

test('upsert deduplicates routes and marks completion at threshold', () => {
  const first = upsertProgress([], {
    route: '/literature/kandar-anubhuti.html',
    titleEn: 'Kandar Anubhuti',
    percent: 50
  }, {
    completedThreshold: 95,
    visitedAt: '2026-07-14T10:00:00Z'
  });
  const second = upsertProgress(first, {
    route: '/literature/kandar-anubhuti.html',
    titleEn: 'Kandar Anubhuti',
    percent: 96
  }, {
    completedThreshold: 95,
    visitedAt: '2026-07-14T11:00:00Z'
  });
  assert.equal(second.length, 1);
  assert.equal(second[0].percent, 96);
  assert.equal(second[0].completedAt, '2026-07-14T11:00:00Z');
});

test('storage roundtrip respects capacity and recency', () => {
  const storage = new MemoryStorage();
  let items = [];
  for (let index = 0; index < 55; index += 1) {
    items = upsertProgress(items, {
      route: `/literature/item-${index}.html`,
      titleEn: `Item ${index}`,
      percent: index
    }, {
      maximumItems: 50,
      visitedAt: `2026-07-14T10:${String(index).padStart(2, '0')}:00Z`
    });
  }
  assert.equal(saveProgress(items, storage, 50), true);
  const loaded = loadProgress(storage, 50);
  assert.equal(loaded.length, 50);
  assert.equal(loaded[0].route, '/literature/item-54.html');
});

test('workspace filters and metrics use route and local progress data', () => {
  const routes = normaliseEligibleRoutes(
    routePayload,
    config
  );
  const records = mergeRoutesWithProgress(
    routes,
    [
      {
        route: '/literature/kandar-anubhuti.html',
        titleEn: 'Kandar Anubhuti',
        percent: 96,
        lastVisitedAt: '2026-07-14T11:00:00Z'
      }
    ]
  );
  assert.equal(
    filterWorkspaceRoutes(records, {
      progressState: 'completed',
      completedThreshold: 95
    }).length,
    1
  );
  assert.equal(
    filterWorkspaceRoutes(records, {
      query: 'சஷ்டி'
    })[0].path,
    '/slokas/kanda-sashti-kavasam.html'
  );
  assert.deepEqual(
    buildWorkspaceMetrics(
      records,
      [{route: '/literature/kandar-anubhuti.html'}],
      95
    ),
    {
      eligible: 2,
      started: 1,
      completed: 1,
      saved: 1
    }
  );
});
