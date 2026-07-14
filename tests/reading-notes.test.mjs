import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  RELEASE,
  STORAGE_KEY,
  buildNoteHref,
  buildNotesMetrics,
  filterNotes,
  loadNotes,
  normaliseNoteRoute,
  removeNote,
  saveNotes,
  sanitiseNoteRecord,
  slugifyHeading,
  upsertNote
} from '../assets/js/reading-notes.mjs';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
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
    new URL('../data/reading-notes.json', import.meta.url),
    'utf8'
  )
);
const allowedKinds = config.allowedKinds.map(item => item.id);

test('release and storage identities are stable', () => {
  assert.equal(RELEASE, 224);
  assert.equal(config.release, 224);
  assert.equal(STORAGE_KEY, 'osb-reading-notes-v1');
  assert.equal(config.maximumItems, 100);
  assert.equal(config.maximumNoteLength, 500);
});

test('same-origin note routes are accepted and external URLs rejected', () => {
  assert.equal(
    normaliseNoteRoute('/literature/kandar-anubhuti.html'),
    '/literature/kandar-anubhuti.html'
  );
  assert.equal(
    normaliseNoteRoute('https://example.com/page.html'),
    ''
  );
});

test('heading ids are deterministic and bounded', () => {
  assert.equal(
    slugifyHeading('கந்தர் அனுபூதி', 0),
    'osb-section-கந-தர-அன-ப-த-1'
  );
  assert.equal(slugifyHeading('', 2), 'osb-section-section-3');
});

test('records require a note or section bookmark', () => {
  const empty = sanitiseNoteRecord({
    route: '/literature/kandar-anubhuti.html',
    titleEn: 'Kandar Anubhuti'
  }, {
    allowedKinds,
    timestamp: '2026-07-14T10:00:00Z'
  });
  assert.equal(empty, null);

  const bookmark = sanitiseNoteRecord({
    route: '/literature/kandar-anubhuti.html',
    headingId: 'section-1',
    headingLabel: 'Section 1'
  }, {
    allowedKinds,
    timestamp: '2026-07-14T10:00:00Z'
  });
  assert.equal(bookmark.headingId, 'section-1');
  assert.equal(bookmark.note, '');
});

test('selected devotional text and page content fields are discarded', () => {
  const note = sanitiseNoteRecord({
    route: '/literature/kandar-anubhuti.html',
    headingId: 'section-1',
    headingLabel: 'Section 1',
    note: 'My own reflection',
    selectedText: 'Must not be stored',
    content: 'Must not be stored',
    pageBody: 'Must not be stored'
  }, {
    allowedKinds,
    timestamp: '2026-07-14T10:00:00Z'
  });
  assert.equal(note.note, 'My own reflection');
  assert.equal('selectedText' in note, false);
  assert.equal('content' in note, false);
  assert.equal('pageBody' in note, false);
});

test('note length and kind are bounded by configuration', () => {
  const note = sanitiseNoteRecord({
    route: '/slokas/kanda-sashti-kavasam.html',
    note: 'x'.repeat(700),
    kind: 'unknown'
  }, {
    maximumNoteLength: 500,
    allowedKinds,
    timestamp: '2026-07-14T10:00:00Z'
  });
  assert.equal(note.note.length, 500);
  assert.equal(note.kind, 'reflection');
});

test('upsert edits one id without duplicating it', () => {
  const first = upsertNote([], {
    id: 'note-1',
    route: '/literature/kandar-anubhuti.html',
    headingId: 'section-1',
    headingLabel: 'Section 1',
    kind: 'question',
    note: 'First'
  }, {
    maximumItems: 100,
    maximumNoteLength: 500,
    allowedKinds,
    timestamp: '2026-07-14T10:00:00Z'
  });
  const second = upsertNote(first, {
    id: 'note-1',
    route: '/literature/kandar-anubhuti.html',
    headingId: 'section-1',
    headingLabel: 'Section 1',
    kind: 'reflection',
    note: 'Updated'
  }, {
    maximumItems: 100,
    maximumNoteLength: 500,
    allowedKinds,
    timestamp: '2026-07-14T11:00:00Z'
  });
  assert.equal(second.length, 1);
  assert.equal(second[0].note, 'Updated');
  assert.equal(second[0].createdAt, '2026-07-14T10:00:00Z');
  assert.equal(second[0].updatedAt, '2026-07-14T11:00:00Z');
});

test('storage roundtrip applies capacity and removal', () => {
  const storage = new MemoryStorage();
  let notes = [];
  for (let index = 0; index < 105; index += 1) {
    notes = upsertNote(notes, {
      id: `note-${index}`,
      route: `/literature/item-${index}.html`,
      note: `Note ${index}`,
      kind: 'reference'
    }, {
      maximumItems: 100,
      maximumNoteLength: 500,
      allowedKinds,
      timestamp: `2026-07-14T10:${String(index % 60).padStart(2, '0')}:00Z`
    });
  }
  assert.equal(saveNotes(notes, storage, 100, {
    maximumNoteLength: 500,
    allowedKinds
  }), true);
  assert.equal(loadNotes(storage, 100, {
    maximumNoteLength: 500,
    allowedKinds
  }).length, 100);

  const remaining = removeNote('note-104', storage, 100, {
    maximumNoteLength: 500,
    allowedKinds
  });
  assert.equal(remaining.some(note => note.id === 'note-104'), false);
});

test('filters, metrics and section href use local records', () => {
  const notes = [
    sanitiseNoteRecord({
      id: 'a',
      route: '/literature/kandar-anubhuti.html',
      titleTa: 'கந்தர் அனுபூதி',
      titleEn: 'Kandar Anubhuti',
      headingId: 'section-1',
      headingLabel: 'Section 1',
      kind: 'reflection',
      note: 'அருள் reflection'
    }, {allowedKinds, timestamp: '2026-07-14T11:00:00Z'}),
    sanitiseNoteRecord({
      id: 'b',
      route: '/slokas/kanda-sashti-kavasam.html',
      titleEn: 'Kanda Sashti Kavasam',
      kind: 'question',
      note: 'Question'
    }, {allowedKinds, timestamp: '2026-07-14T10:00:00Z'})
  ];

  assert.equal(filterNotes(notes, {kind: 'question'}).length, 1);
  assert.equal(filterNotes(notes, {query: 'அருள்'})[0].id, 'a');
  assert.deepEqual(buildNotesMetrics(notes), {
    total: 2,
    routes: 2,
    sectionBookmarks: 1,
    writtenNotes: 2
  });
  assert.equal(
    buildNoteHref(notes[0]),
    '/literature/kandar-anubhuti.html#section-1'
  );
});
