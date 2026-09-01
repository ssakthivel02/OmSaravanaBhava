import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  RELEASE,
  DESKTOP_BREAKPOINT,
  clampSelectionIndex,
  nextKeyboardIndex,
  progressStateLabel,
  buildReadingHref,
  selectVisibleRecord,
  isEditableTarget
} from '../assets/js/reading-workspace-desktop.mjs';

test('release and desktop breakpoint are stable', () => {
  assert.equal(RELEASE, 229);
  assert.equal(DESKTOP_BREAKPOINT, 1180);
});

test('selection index is bounded', () => {
  assert.equal(clampSelectionIndex(-4, 5), 0);
  assert.equal(clampSelectionIndex(8, 5), 4);
  assert.equal(clampSelectionIndex(2, 5), 2);
  assert.equal(clampSelectionIndex(0, 0), -1);
});

test('listbox keyboard movement is deterministic', () => {
  assert.equal(nextKeyboardIndex('ArrowDown', 0, 4), 1);
  assert.equal(nextKeyboardIndex('ArrowDown', 3, 4), 3);
  assert.equal(nextKeyboardIndex('ArrowUp', 0, 4), 0);
  assert.equal(nextKeyboardIndex('Home', 2, 4), 0);
  assert.equal(nextKeyboardIndex('End', 1, 4), 3);
  assert.equal(nextKeyboardIndex('PageDown', 1, 4), 1);
});

test('progress labels stay factual and bounded', () => {
  assert.equal(progressStateLabel(-8), 'Not started');
  assert.equal(progressStateLabel(32.4), '32% read');
  assert.equal(progressStateLabel(95), 'Completed locally');
  assert.equal(progressStateLabel(500), 'Completed locally');
});

test('reading href resumes only genuine in-progress records', () => {
  const record = {path: '/literature/test.html', progress: {percent: 50}};
  assert.equal(buildReadingHref(record), '/literature/test.html?resume=1');
  assert.equal(
    buildReadingHref({...record, progress: {percent: 0}}),
    '/literature/test.html'
  );
  assert.equal(
    buildReadingHref({...record, progress: {percent: 100}}),
    '/literature/test.html'
  );
  assert.equal(buildReadingHref({path: 'https://evil.example'}), '');
});

test('visible selection is preserved or falls back safely', () => {
  const records = [{path: '/a'}, {path: '/b'}];
  assert.equal(selectVisibleRecord(records, '/b').path, '/b');
  assert.equal(selectVisibleRecord(records, '/missing').path, '/a');
  assert.equal(selectVisibleRecord([], '/a'), null);
});

test('keyboard shortcut avoids editable controls', () => {
  assert.equal(isEditableTarget({tagName: 'INPUT'}), true);
  assert.equal(isEditableTarget({tagName: 'textarea'}), true);
  assert.equal(isEditableTarget({tagName: 'DIV', isContentEditable: true}), true);
  assert.equal(isEditableTarget({tagName: 'BUTTON'}), false);
});

test('page contains one accessible master-detail navigator', async () => {
  const html = await readFile(
    new URL('../reading-workspace.html', import.meta.url),
    'utf8'
  );
  for (const marker of [
    'data-release="229"',
    'id="readingWorkspaceDesktop"',
    'id="readingWorkspaceRouteList"',
    'role="listbox"',
    'id="readingWorkspaceInspector"',
    'assets/js/reading-workspace-desktop.mjs',
    'assets/css/reading-workspace-desktop.css'
  ]) {
    assert.ok(html.includes(marker), `missing ${marker}`);
  }
  assert.equal(
    (html.match(/id="readingWorkspaceRouteList"/g) || []).length,
    1
  );
});

test('desktop styles include visible focus and reduced motion', async () => {
  const css = await readFile(
    new URL('../assets/css/reading-workspace-desktop.css', import.meta.url),
    'utf8'
  );
  for (const marker of [
    '@media (min-width: 1180px)',
    ':focus-visible',
    '@media (prefers-reduced-motion: reduce)',
    'grid-template-columns',
    '@media print'
  ]) {
    assert.ok(css.includes(marker), `missing ${marker}`);
  }
});

test('module creates no new storage key or tracking surface', async () => {
  const source = await readFile(
    new URL('../assets/js/reading-workspace-desktop.mjs', import.meta.url),
    'utf8'
  );
  for (const forbidden of [
    'localStorage.setItem',
    'sessionStorage.setItem',
    'indexedDB.open',
    'navigator.sendBeacon',
    'google-analytics',
    'gtag(',
    'mixpanel',
    'segment.io'
  ]) {
    assert.equal(source.includes(forbidden), false, `forbidden ${forbidden}`);
  }
});
