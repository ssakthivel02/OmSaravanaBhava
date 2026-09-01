import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const paths = [
  'assets/js/route-status-reconciliation.js',
  'assets/js/effective-route-registry.mjs',
  'assets/js/content-status-audit.mjs',
  'assets/js/discovery-workspace.mjs',
  'assets/js/site-directory.mjs'
];

test('route consumer implementation never assigns global fetch', async () => {
  for (const path of paths) {
    const source = await readFile(path, 'utf8');
    assert.doesNotMatch(
      source,
      /globalThis\.fetch\s*=|window\.fetch\s*=/
    );
  }
});

test('legacy helper exposes explicit override loader', async () => {
  const source = await readFile(
    'assets/js/route-status-reconciliation.js',
    'utf8'
  );
  assert.match(source, /loadOverrides/);
  assert.match(source, /globalFetchReplaced:\s*false/);
});
