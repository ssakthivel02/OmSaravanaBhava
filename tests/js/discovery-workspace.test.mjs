import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDiscoveryMetrics,
  filterDiscoveryItems,
  normaliseDiscoveryModel
} from '../../assets/js/discovery-workspace.mjs';

const lenses = {
  release: 222,
  allowedStatuses: ['published', 'partial-reviewed'],
  excludedStatuses: ['draft'],
  featuredLensIds: ['literature'],
  lenses: [
    {
      id: 'literature',
      titleTa: 'இலக்கியம்',
      titleEn: 'Literature',
      sectionIds: ['literature']
    }
  ]
};

const navigation = {
  release: 222,
  audienceLabels: {'reader': 'Reader'},
  sections: [
    {
      id: 'literature',
      audiences: ['reader'],
      items: [
        {path: '/a.html', titleEn: 'A'},
        {path: '/b.html', titleEn: 'B'},
        {path: '/c.html', titleEn: 'C'}
      ]
    }
  ]
};

const routes = {
  release: 228,
  effectiveRegistryRelease: 234,
  effectiveRegistryMode: 'explicit-overrides',
  effectiveRegistryDiagnostics: {
    historicalCount: 3,
    appliedCount: 2
  },
  routes: [
    {
      path: '/a.html',
      titleEn: 'A',
      category: 'Literature',
      status: 'partial-reviewed',
      summary: 'Eligible',
      readingEligible: true,
      effectiveOverrideApplied: true
    },
    {
      path: '/b.html',
      titleEn: 'B',
      category: 'Literature',
      status: 'source-register',
      summary: 'Excluded',
      readingEligible: false,
      effectiveOverrideApplied: true
    },
    {
      path: '/c.html',
      titleEn: 'C',
      category: 'Literature',
      status: 'draft',
      summary: 'Draft',
      readingEligible: true
    }
  ]
};

test('model excludes reading-ineligible and configured statuses', () => {
  const model = normaliseDiscoveryModel(
    lenses,
    navigation,
    routes
  );
  assert.equal(model.items.length, 1);
  assert.equal(model.items[0].path, '/a.html');
  assert.equal(model.items[0].status, 'partial-reviewed');
});

test('filter supports audience, status and text query', () => {
  const model = normaliseDiscoveryModel(
    lenses,
    navigation,
    routes
  );
  assert.equal(
    filterDiscoveryItems(model, {
      audience: 'reader',
      status: 'partial-reviewed',
      query: 'eligible'
    }).length,
    1
  );
  assert.equal(
    filterDiscoveryItems(model, {query: 'missing'}).length,
    0
  );
});

test('metrics report explicit overrides in eligible routes', () => {
  const model = normaliseDiscoveryModel(
    lenses,
    navigation,
    routes
  );
  const metrics = buildDiscoveryMetrics(model);
  assert.equal(metrics.routeCount, 1);
  assert.equal(metrics.overrideCount, 1);
  assert.equal(metrics.categoryCount, 1);
});
