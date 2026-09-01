import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RELEASE,
  STORAGE_KEY,
  MAX_HISTORY_ITEMS,
  buildHistorySummary,
  clearHistory,
  isPlaybackStartStatus,
  loadHistory,
  normaliseHistoryItem,
  normaliseTrackRoute,
  recordPlaybackStart,
  removeHistoryItem,
  saveHistory,
  upsertHistory
} from '../assets/js/audio-history.mjs';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const track = {
  id: 'saravanabhava-mantra',
  titleTa: 'சரவணபவ மந்திரம்',
  titleEn: 'Saravanabhava Mantra',
  artist: 'Traditional devotional text',
  album: 'Murugan Mantras',
  kind: 'Mantra',
  route: 'slokas/om-saravana-bhava.html',
  playbackMode: 'device-tts',
  publicationStatus: 'published',
  recordingRights: 'No third-party performance recording bundled'
};

test('release, storage and capacity identities are stable', () => {
  assert.equal(RELEASE, 219);
  assert.equal(STORAGE_KEY, 'osb-audio-listening-history-v1');
  assert.equal(MAX_HISTORY_ITEMS, 20);
});

test('track routes are same-origin and normalised', () => {
  assert.equal(
    normaliseTrackRoute('slokas/om-saravana-bhava.html'),
    '/slokas/om-saravana-bhava.html'
  );
  assert.equal(normaliseTrackRoute('https://example.com/audio.html'), '');
});

test('history items retain rights and publication boundaries', () => {
  const item = normaliseHistoryItem(track, '2026-07-14T10:00:00Z');
  assert.equal(item.playbackMode, 'device-tts');
  assert.equal(item.publicationStatus, 'published');
  assert.equal(item.recordingRights, 'No third-party performance recording bundled');
  assert.equal(item.playCount, 1);
});

test('only first-section start messages qualify as actual starts', () => {
  assert.equal(isPlaybackStartStatus('Reading section 1 of 4 with Tamil.'), true);
  assert.equal(isPlaybackStartStatus('Reading section 2 of 4 with Tamil.'), false);
  assert.equal(isPlaybackStartStatus('Selected item. Press Play to begin.'), false);
  assert.equal(isPlaybackStartStatus('Read-aloud resumed.'), false);
});

test('upsert increments a unique track and moves it to the front', () => {
  const first = upsertHistory([], track, '2026-07-14T10:00:00Z');
  const second = upsertHistory([
    {
      ...first[0],
      id: 'another',
      route: '/another.html',
      titleEn: 'Another'
    },
    ...first
  ], track, '2026-07-14T11:00:00Z');
  assert.equal(second[0].id, track.id);
  assert.equal(second[0].playCount, 2);
  assert.equal(second[0].lastPlayedAt, '2026-07-14T11:00:00Z');
  assert.equal(second.filter(item => item.id === track.id).length, 1);
});

test('history is capped at twenty unique items', () => {
  let items = [];
  for (let index = 0; index < 25; index += 1) {
    items = upsertHistory(items, {
      ...track,
      id: `track-${index}`,
      route: `/track-${index}.html`,
      titleEn: `Track ${index}`
    }, `2026-07-14T10:${String(index).padStart(2, '0')}:00Z`);
  }
  assert.equal(items.length, 20);
  assert.equal(items[0].id, 'track-24');
  assert.equal(items.at(-1).id, 'track-5');
});

test('record, summary, remove and clear remain browser-local', () => {
  const storage = new MemoryStorage();
  recordPlaybackStart(track, storage, '2026-07-14T10:00:00Z');
  recordPlaybackStart(track, storage, '2026-07-14T11:00:00Z');
  const loaded = loadHistory(storage);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].playCount, 2);
  assert.deepEqual(buildHistorySummary(loaded), {
    uniqueTracks: 1,
    recordedStarts: 2,
    latestPlayedAt: '2026-07-14T11:00:00Z'
  });
  removeHistoryItem(track.id, storage);
  assert.equal(loadHistory(storage).length, 0);
  saveHistory([normaliseHistoryItem(track)], storage);
  assert.equal(clearHistory(storage), true);
  assert.equal(loadHistory(storage).length, 0);
});
