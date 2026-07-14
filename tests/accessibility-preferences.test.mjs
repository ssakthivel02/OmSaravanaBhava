import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RELEASE,
  STORAGE_KEY,
  DEFAULT_PREFERENCES,
  activePreferenceLabels,
  applyPreferences,
  loadPreferences,
  normalisePreferences,
  resetPreferences,
  savePreferences,
  updatePreference
} from '../assets/js/accessibility-preferences.mjs';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  toggle(value, force) {
    if (force) this.values.add(value);
    else this.values.delete(value);
  }
  contains(value) { return this.values.has(value); }
}

const makeDocument = () => {
  const links = new Map();
  const root = {classList: new FakeClassList(), dataset: {}};
  return {
    documentElement: root,
    head: {appendChild(node) { links.set(node.id, node); }},
    createElement() { return {}; },
    getElementById(id) { return links.get(id) || null; }
  };
};

test('release and defaults are stable', () => {
  assert.equal(RELEASE, 217);
  assert.equal(STORAGE_KEY, 'osb-accessibility-preferences-v1');
  assert.deepEqual(normalisePreferences({largeText: 1, highContrast: true}), {
    largeText: false,
    highContrast: true,
    reducedMotion: false,
    underlinedLinks: false
  });
});

test('preferences save and load locally', () => {
  const storage = new MemoryStorage();
  assert.equal(savePreferences({largeText: true, underlinedLinks: true}, storage), true);
  assert.deepEqual(loadPreferences(storage), {
    largeText: true,
    highContrast: false,
    reducedMotion: false,
    underlinedLinks: true
  });
});

test('applyPreferences toggles only declared root classes', () => {
  const documentRef = makeDocument();
  const applied = applyPreferences({
    largeText: true,
    highContrast: true,
    reducedMotion: false,
    underlinedLinks: true
  }, documentRef);
  assert.equal(applied.largeText, true);
  assert.equal(documentRef.documentElement.classList.contains('osb-a11y-ready'), true);
  assert.equal(documentRef.documentElement.classList.contains('osb-a11y-large-text'), true);
  assert.equal(documentRef.documentElement.classList.contains('osb-a11y-high-contrast'), true);
  assert.equal(documentRef.documentElement.classList.contains('osb-a11y-reduced-motion'), false);
  assert.equal(documentRef.documentElement.classList.contains('osb-a11y-underlined-links'), true);
});

test('updatePreference rejects unknown keys and persists known keys', () => {
  const storage = new MemoryStorage();
  const documentRef = makeDocument();
  assert.throws(() => updatePreference('unknown', true, storage, documentRef), TypeError);
  const updated = updatePreference('reducedMotion', true, storage, documentRef);
  assert.equal(updated.reducedMotion, true);
  assert.equal(loadPreferences(storage).reducedMotion, true);
});

test('reset removes local state and returns defaults', () => {
  const storage = new MemoryStorage();
  const documentRef = makeDocument();
  savePreferences({highContrast: true}, storage);
  const reset = resetPreferences(storage, documentRef);
  assert.deepEqual(reset, {...DEFAULT_PREFERENCES});
  assert.deepEqual(loadPreferences(storage), {...DEFAULT_PREFERENCES});
});

test('active labels describe enabled preferences only', () => {
  assert.deepEqual(
    activePreferenceLabels({largeText: true, reducedMotion: true}),
    ['Large text', 'Reduced motion']
  );
});
