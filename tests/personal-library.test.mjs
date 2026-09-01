import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  RELEASE,
  accessibilityLabels,
  buildActivityEvents,
  buildPersonalLibraryModel,
  filterActivityEvents,
  normaliseLibraryRoute,
  normaliseRouteRegistry,
  readLocalDatasets
} from '../assets/js/personal-library.mjs';

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }
  getItem(key) {
    return this.values.has(key)
      ? this.values.get(key)
      : null;
  }
}

const config = JSON.parse(
  fs.readFileSync(
    new URL('../data/personal-library.json', import.meta.url),
    'utf8'
  )
);

const routesPayload = {
  release: 226,
  routes: [
    {
      path: '/literature/kandar-anubhuti.html',
      titleTa: 'கந்தர் அனுபூதி',
      titleEn: 'Kandar Anubhuti',
      category: 'Literature',
      status: 'published',
      summary: 'Published route'
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
      path: '/draft.html',
      titleEn: 'Draft',
      category: 'Internal',
      status: 'draft',
      summary: 'Excluded'
    }
  ]
};

const datasets = {
  readingList: [
    {
      route: '/literature/kandar-anubhuti.html',
      savedAt: '2026-07-14T09:00:00Z'
    },
    {
      route: '/removed.html',
      savedAt: '2026-07-14T08:00:00Z'
    }
  ],
  readingProgress: [
    {
      route: '/literature/kandar-anubhuti.html',
      percent: 42,
      lastVisitedAt: '2026-07-14T11:00:00Z'
    },
    {
      route: '/slokas/kanda-sashti-kavasam.html',
      percent: 96,
      lastVisitedAt: '2026-07-14T10:00:00Z'
    }
  ],
  readingNotes: [
    {
      id: 'note-1',
      route: '/literature/kandar-anubhuti.html',
      headingId: 'section-1',
      headingLabel: 'Section 1',
      kind: 'reflection',
      note: 'அருள் reflection',
      updatedAt: '2026-07-14T12:00:00Z'
    }
  ],
  accessibility: {
    largeText: true,
    highContrast: false,
    reducedMotion: true,
    underlinedLinks: false
  },
  audioHistory: [
    {
      id: 'audio-1',
      route: '/slokas/kanda-sashti-kavasam.html',
      titleEn: 'Kanda Sashti Kavasam',
      playCount: 3,
      lastPlayedAt: '2026-07-14T13:00:00Z'
    }
  ]
};

test('release and read-only configuration identity are stable', () => {
  assert.equal(RELEASE, 226);
  assert.equal(config.release, 226);
  assert.equal(config.completedThreshold, 95);
  assert.equal(config.storageKeys.readingNotes, 'osb-reading-notes-v1');
});

test('same-origin routes are accepted and external routes rejected', () => {
  assert.equal(
    normaliseLibraryRoute('/literature/kandar-anubhuti.html'),
    '/literature/kandar-anubhuti.html'
  );
  assert.equal(
    normaliseLibraryRoute('https://example.com/page.html'),
    ''
  );
});

test('route registry excludes drafts and preserves bounded states', () => {
  const map = normaliseRouteRegistry(routesPayload, config);
  assert.equal(map.size, 2);
  assert.equal(map.has('/draft.html'), false);
  assert.equal(
    map.get('/slokas/kanda-sashti-kavasam.html').status,
    'partial-reviewed'
  );
});

test('local dataset reader uses only configured keys', () => {
  const storage = new MemoryStorage({
    'osb-reading-list-v1': JSON.stringify([{route: '/a.html'}]),
    'unregistered-secret': JSON.stringify({secret: true})
  });
  const result = readLocalDatasets(storage, config.storageKeys);
  assert.equal(result.readingList.length, 1);
  assert.equal('unregistered-secret' in result, false);
});

test('personal library model derives actual local metrics', () => {
  const model = buildPersonalLibraryModel(
    config,
    routesPayload,
    datasets
  );
  assert.equal(model.metrics.savedRoutes, 1);
  assert.equal(model.metrics.inProgress, 1);
  assert.equal(model.metrics.completed, 1);
  assert.equal(model.metrics.notes, 1);
  assert.equal(model.metrics.sectionBookmarks, 1);
  assert.equal(model.metrics.audioTracks, 1);
  assert.equal(model.metrics.audioStarts, 3);
  assert.equal(model.metrics.activePreferences, 2);
  assert.equal(model.ignoredRecords, 1);
  assert.equal(model.continueReading[0].percent, 42);
  assert.equal(model.completed[0].percent, 96);
});

test('activity timeline is deterministic and newest first', () => {
  const model = buildPersonalLibraryModel(
    config,
    routesPayload,
    datasets
  );
  assert.equal(model.activity[0].type, 'audio');
  assert.equal(model.activity[1].type, 'note');
  assert.equal(model.activity.length, 5);
});

test('activity filtering supports type and Tamil search', () => {
  const events = buildActivityEvents({
    readingList: [],
    progress: [],
    notes: [{
      id: 'note-1',
      path: '/literature/kandar-anubhuti.html',
      titleTa: 'கந்தர் அனுபூதி',
      titleEn: 'Kandar Anubhuti',
      category: 'Literature',
      status: 'published',
      kind: 'reflection',
      note: 'அருள்',
      updatedAt: '2026-07-14T12:00:00Z'
    }],
    audio: [{
      id: 'audio-1',
      path: '/slokas/kanda-sashti-kavasam.html',
      titleEn: 'Kanda Sashti Kavasam',
      category: 'Sloka',
      status: 'published',
      kind: 'Read-aloud',
      playCount: 1,
      lastPlayedAt: '2026-07-14T13:00:00Z'
    }]
  }, 30);

  assert.equal(
    filterActivityEvents(events, {type: 'note'}).length,
    1
  );
  assert.equal(
    filterActivityEvents(events, {query: 'அருள்'})[0].type,
    'note'
  );
});

test('accessibility labels use bounded boolean preferences', () => {
  assert.deepEqual(
    accessibilityLabels({
      largeText: true,
      highContrast: 1,
      reducedMotion: true,
      underlinedLinks: false
    }),
    ['Large text', 'Reduced motion']
  );
});

test('module contains no browser-data write operations', () => {
  const source = fs.readFileSync(
    new URL('../assets/js/personal-library.mjs', import.meta.url),
    'utf8'
  );
  assert.equal(source.includes('.setItem('), false);
  assert.equal(source.includes('.removeItem('), false);
  assert.equal(source.includes('localStorage.clear('), false);
  assert.equal(source.includes('navigator.sendBeacon'), false);
});
