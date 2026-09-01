import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  RELEASE,
  buildDiscoveryMetrics,
  filterDiscoveryItems,
  itemsForLens,
  lensRouteCounts,
  normaliseDiscoveryModel,
  normaliseRoute
} from '../assets/js/discovery-workspace.mjs';

const lenses = JSON.parse(
  fs.readFileSync(
    new URL('../data/discovery-lenses.json', import.meta.url),
    'utf8'
  )
);

const navigation = {
  release: 214,
  audienceLabels: {
    all: 'All visitors',
    new: 'New visitor',
    devotee: 'Devotee',
    learner: 'Learner',
    researcher: 'Researcher'
  },
  sections: [
    {
      id: 'start',
      titleTa: 'தொடக்கம்',
      titleEn: 'Start',
      audiences: ['all', 'new'],
      items: [
        {
          path: '/site-directory.html',
          titleEn: 'Site Directory',
          description: 'Find routes'
        },
        {
          path: '/draft.html',
          titleEn: 'Draft'
        }
      ]
    },
    {
      id: 'literature',
      titleTa: 'இலக்கியம்',
      titleEn: 'Literature',
      audiences: ['all', 'devotee', 'learner'],
      items: [
        {
          path: '/thiruppugazh.html',
          titleTa: 'திருப்புகழ்',
          titleEn: 'Thiruppugazh',
          description: 'Published songs'
        }
      ]
    }
  ]
};

const routes = {
  release: 222,
  routes: [
    {
      path: '/site-directory.html',
      titleEn: 'Site Directory',
      category: 'Navigation',
      status: 'directory',
      summary: 'Directory'
    },
    {
      path: '/thiruppugazh.html',
      titleTa: 'திருப்புகழ்',
      titleEn: 'Thiruppugazh',
      category: 'Literature',
      status: 'published',
      summary: 'Songs'
    },
    {
      path: '/draft.html',
      titleEn: 'Draft',
      category: 'Internal',
      status: 'draft',
      summary: 'Do not publish'
    },
    {
      path: '/unreferenced.html',
      titleEn: 'Unreferenced',
      category: 'Other',
      status: 'published',
      summary: 'Not in structured navigation'
    }
  ]
};

const model = normaliseDiscoveryModel(
  lenses,
  navigation,
  routes
);

test('release and lens configuration identity are stable', () => {
  assert.equal(RELEASE, 222);
  assert.equal(lenses.release, 222);
  assert.equal(lenses.lenses.length, 9);
});

test('same-origin routes are accepted and external routes rejected', () => {
  assert.equal(
    normaliseRoute('literature/kandar-anubhuti.html'),
    '/literature/kandar-anubhuti.html'
  );
  assert.equal(
    normaliseRoute('https://example.com/page.html'),
    ''
  );
});

test('only routes present in both registries are displayed', () => {
  assert.deepEqual(
    model.items.map(item => item.path).sort(),
    ['/site-directory.html', '/thiruppugazh.html']
  );
});

test('drafts and unreferenced routes are excluded', () => {
  assert.equal(
    model.items.some(item => item.path === '/draft.html'),
    false
  );
  assert.equal(
    model.items.some(item => item.path === '/unreferenced.html'),
    false
  );
});

test('lens and audience filtering use structured navigation', () => {
  assert.equal(
    itemsForLens(model, 'start').length,
    1
  );
  assert.equal(
    itemsForLens(model, 'literature').length,
    1
  );
  assert.equal(
    filterDiscoveryItems(model, {
      audience: 'new'
    }).length,
    1
  );
  assert.equal(
    filterDiscoveryItems(model, {
      audience: 'devotee'
    }).length,
    1
  );
});

test('status and Tamil text filters are deterministic', () => {
  assert.equal(
    filterDiscoveryItems(model, {
      status: 'published'
    }).length,
    1
  );
  assert.equal(
    filterDiscoveryItems(model, {
      query: 'திருப்புகழ்'
    })[0].path,
    '/thiruppugazh.html'
  );
});

test('metrics and lens counts are derived from model data', () => {
  assert.deepEqual(
    buildDiscoveryMetrics(model),
    {
      routeCount: 2,
      sectionCount: 2,
      categoryCount: 2,
      lensCount: 9,
      statuses: [
        {status: 'directory', count: 1},
        {status: 'published', count: 1}
      ]
    }
  );
  const counts = new Map(
    lensRouteCounts(model)
      .map(item => [item.id, item.count])
  );
  assert.equal(counts.get('all'), 2);
  assert.equal(counts.get('start'), 1);
  assert.equal(counts.get('literature'), 1);
});

test('model keeps source release identities visible', () => {
  assert.equal(model.release, 222);
  assert.equal(model.routeRelease, 222);
  assert.equal(model.navigationRelease, 214);
});
