import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RELEASE,
  buildFacetModel,
  filterFacetRecords,
  isPublishedRecord,
  normaliseRoutePath,
  publicationGroup
} from '../assets/js/search-facets.mjs';

const routes = {
  routes: [
    {path: '/temples/palani.html'},
    {path: '/slokas/example.html'},
    {path: '/literature/register.html'},
    {path: '/audio-library.html'}
  ]
};

const records = [
  {
    kind: 'Temple',
    id: 'palani',
    titleTa: 'பழனி',
    titleEn: 'Palani',
    route: 'temples/palani.html',
    status: 'published-source-linked',
    tags: ['murugan']
  },
  {
    kind: 'Sloka',
    id: 'opening',
    titleTa: 'தொடக்கம்',
    titleEn: 'Opening Extract',
    route: 'slokas/example.html',
    status: 'partial-reviewed',
    tags: []
  },
  {
    kind: 'Literature',
    id: 'register',
    titleEn: 'Source Register',
    route: 'literature/register.html',
    status: 'source-register',
    tags: []
  },
  {
    kind: 'Audio',
    id: 'tts',
    titleEn: 'Device Read Aloud',
    route: 'audio-library.html?track=tts',
    status: 'reviewed-opening-extract',
    tags: ['device-tts']
  },
  {
    kind: 'Audio',
    id: 'draft',
    titleEn: 'Draft',
    route: 'audio-library.html?track=draft',
    status: 'source-review-required',
    tags: ['not-published']
  },
  {
    kind: 'Temple',
    id: 'missing',
    titleEn: 'Missing route',
    route: 'temples/missing.html',
    status: 'published',
    tags: []
  }
];

test('release identity is 216', () => {
  assert.equal(RELEASE, 216);
});

test('route normalisation removes query and fragment', () => {
  assert.equal(normaliseRoutePath('audio-library.html?track=tts#part'), '/audio-library.html');
});

test('publication groups preserve bounded editorial status', () => {
  assert.equal(publicationGroup('published-source-linked'), 'published');
  assert.equal(publicationGroup('partial-reviewed'), 'bounded');
  assert.equal(publicationGroup('source-register'), 'register');
  assert.equal(publicationGroup('source-review-required'), 'excluded');
});

test('draft-like and missing-route records are excluded', () => {
  const routePaths = new Set(routes.routes.map(item => item.path));
  assert.equal(isPublishedRecord(records[0], routePaths), true);
  assert.equal(isPublishedRecord(records[4], routePaths), false);
  assert.equal(isPublishedRecord(records[5], routePaths), false);
});

test('facet counts are derived from published records', () => {
  const model = buildFacetModel(records, routes);
  assert.equal(model.total, 4);
  assert.equal(model.counts.get('Audio'), 1);
  assert.equal(model.counts.get('Temple'), 1);
  assert.equal(model.statusCounts.get('bounded'), 2);
  assert.equal(model.statusCounts.get('register'), 1);
});

test('Tamil query and kind filters work locally', () => {
  const model = buildFacetModel(records, routes);
  assert.equal(filterFacetRecords(model, {query: 'பழனி'}).length, 1);
  assert.equal(filterFacetRecords(model, {kind: 'Audio'}).length, 1);
  assert.equal(filterFacetRecords(model, {status: 'register'}).length, 1);
});
