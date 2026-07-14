import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RELEASE,
  EXCLUDED_PATHS,
  buildPrintMetadata,
  normaliseCanonical,
  normalisePath,
  requestPrint,
  shouldOfferPrint
} from '../assets/js/print-support.mjs';

test('release and excluded routes are stable', () => {
  assert.equal(RELEASE, 218);
  assert.equal(EXCLUDED_PATHS.has('/404.html'), true);
  assert.equal(EXCLUDED_PATHS.has('/offline.html'), true);
});

test('paths are normalised safely', () => {
  assert.equal(normalisePath('temples/palani.html?view=full#main'), '/temples/palani.html');
  assert.equal(normalisePath(''), '/');
});

test('print controls require a main region and respect opt-out routes', () => {
  assert.equal(shouldOfferPrint('/literature/vel-maaral.html', {}, true), true);
  assert.equal(shouldOfferPrint('/404.html', {}, true), false);
  assert.equal(shouldOfferPrint('/offline.html', {}, true), false);
  assert.equal(shouldOfferPrint('/temples.html', {printDisabled: 'true'}, true), false);
  assert.equal(shouldOfferPrint('/temples.html', {}, false), false);
});

test('canonical URLs remain same-origin', () => {
  assert.equal(
    normaliseCanonical('/literature/vel-maaral.html'),
    'https://omsaravanabhava.org/literature/vel-maaral.html'
  );
  assert.equal(normaliseCanonical('https://example.com/file.html'), '');
});

test('print metadata keeps bounded wording', () => {
  const metadata = buildPrintMetadata({
    title: 'Vel Maaral',
    canonical: '/literature/vel-maaral.html',
    language: 'ta'
  });
  assert.equal(metadata.title, 'Vel Maaral');
  assert.equal(metadata.language, 'ta');
  assert.match(metadata.note, /publication boundaries remain unchanged/);
});

test('requestPrint delegates only when the browser print function exists', () => {
  let calls = 0;
  assert.equal(requestPrint({print() { calls += 1; }}), true);
  assert.equal(calls, 1);
  assert.equal(requestPrint({}), false);
});
