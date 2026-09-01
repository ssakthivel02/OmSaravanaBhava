import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RELEASE,
  STORAGE_KEY,
  USER_READING_CACHE,
  cacheSavedRoutes,
  cacheableRoute,
  isRouteSaved,
  loadReadingList,
  normaliseReadingRoute,
  removeReadingRoute,
  saveReadingRecord,
  upsertReadingItem
} from '../assets/js/reading-list.mjs';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test('release and storage identities are stable', () => {
  assert.equal(RELEASE, 216);
  assert.equal(STORAGE_KEY, 'osb-reading-list-v1');
  assert.equal(USER_READING_CACHE, 'osb-user-reading-v1');
});

test('same-origin routes are normalised and external routes are rejected', () => {
  assert.equal(
    normaliseReadingRoute('temples/palani.html?view=full#main'),
    '/temples/palani.html?view=full#main'
  );
  assert.equal(normaliseReadingRoute('https://example.com/page.html'), '');
  assert.equal(cacheableRoute('/temples/palani.html?view=full#main'), '/temples/palani.html?view=full');
});

test('upsert deduplicates a saved route and keeps the newest record first', () => {
  const first = upsertReadingItem([], {
    route: '/temples/palani.html',
    titleEn: 'Palani',
    kind: 'Temple',
    status: 'published'
  }, '2026-07-14T10:00:00Z');
  const second = upsertReadingItem(first, {
    route: 'temples/palani.html',
    titleEn: 'Palani Temple',
    kind: 'Temple',
    status: 'published'
  }, '2026-07-14T11:00:00Z');
  assert.equal(second.length, 1);
  assert.equal(second[0].titleEn, 'Palani Temple');
  assert.equal(second[0].savedAt, '2026-07-14T11:00:00Z');
});

test('storage save, lookup and remove remain browser-local', () => {
  const storage = new MemoryStorage();
  saveReadingRecord({
    route: '/slokas/om-saravana-bhava.html',
    titleTa: 'ஓம் சரவணபவ',
    titleEn: 'Om Saravana Bhava',
    kind: 'Sloka',
    status: 'published'
  }, storage);
  assert.equal(loadReadingList(storage).length, 1);
  assert.equal(isRouteSaved('/slokas/om-saravana-bhava.html', storage), true);
  removeReadingRoute('/slokas/om-saravana-bhava.html', storage);
  assert.equal(loadReadingList(storage).length, 0);
});

test('offline caching handles each route independently', async () => {
  const puts = [];
  const cacheStorage = {
    async open(name) {
      assert.equal(name, USER_READING_CACHE);
      return {
        async put(route) { puts.push(route); }
      };
    }
  };
  const fetcher = async route => {
    if (route.includes('missing')) throw new Error('network');
    return {ok: true, clone() { return this; }};
  };
  const result = await cacheSavedRoutes([
    {route: '/temples/palani.html'},
    {route: '/missing.html'},
    {route: '/temples/palani.html#main'}
  ], cacheStorage, fetcher);
  assert.deepEqual(result.cached, ['/temples/palani.html']);
  assert.equal(result.failed.length, 1);
  assert.deepEqual(puts, ['/temples/palani.html']);
});
