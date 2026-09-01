import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRouteMap,
  buildStatusCounts,
  evaluateBoundary,
  filterBoundaryRecords,
  summariseAudit
} from '../../assets/js/content-status-audit.mjs';

const routes = {
  routes: [
    {
      path: '/a.html',
      status: 'partial-reviewed',
      publicationStatusPrevious: 'published',
      effectiveOverrideApplied: true,
      readingEligible: true
    },
    {
      path: '/b.html',
      status: 'published'
    }
  ],
  effectiveRegistryDiagnostics: {appliedCount: 1}
};

test('effective boundary alignment uses composed status', () => {
  const map = buildRouteMap(routes);
  const evaluated = evaluateBoundary(
    {
      route: '/a.html',
      declaredRouteStatus: 'published',
      verifiedStatus: 'partial-reviewed',
      readingEligible: true
    },
    map.get('/a.html')
  );
  assert.equal(evaluated.aligned, true);
  assert.equal(evaluated.mismatch, false);
  assert.equal(evaluated.previousStatus, 'published');
  assert.equal(evaluated.overrideApplied, true);
});

test('status counts use effective values', () => {
  assert.deepEqual(buildStatusCounts(routes), [
    {status: 'partial-reviewed', count: 1},
    {status: 'published', count: 1}
  ]);
});

test('filters and summary operate on evaluated records', () => {
  const records = [
    {
      route: '/a.html',
      titleEn: 'A',
      mismatch: false,
      aligned: true,
      readingExcluded: false
    },
    {
      route: '/b.html',
      titleEn: 'B',
      mismatch: true,
      aligned: false,
      readingExcluded: true
    }
  ];
  assert.equal(
    filterBoundaryRecords(records, {state: 'mismatch'}).length,
    1
  );
  assert.equal(
    filterBoundaryRecords(records, {query: 'A'}).length,
    1
  );
  assert.deepEqual(summariseAudit(routes, records), {
    routes: 2,
    audited: 2,
    mismatches: 1,
    aligned: 1,
    excluded: 1,
    overrides: 1
  });
});
