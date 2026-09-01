import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterDirectoryRecords
} from '../../assets/js/site-directory.mjs';

const records = [
  {
    path: '/a.html',
    titleTa: 'அ',
    titleEn: 'A',
    category: 'Literature',
    status: 'partial-reviewed',
    summary: 'Opening verse'
  },
  {
    path: '/b.html',
    titleEn: 'B',
    category: 'Temples',
    status: 'published',
    summary: 'Temple guide'
  }
];

test('directory filters category and status', () => {
  assert.equal(
    filterDirectoryRecords(records, {
      category: 'Literature',
      status: 'partial-reviewed'
    }).length,
    1
  );
  assert.equal(
    filterDirectoryRecords(records, {
      category: 'Temples',
      status: 'partial-reviewed'
    }).length,
    0
  );
});

test('directory search covers Tamil and English metadata', () => {
  assert.equal(
    filterDirectoryRecords(records, {query: 'அ'}).length,
    1
  );
  assert.equal(
    filterDirectoryRecords(records, {query: 'temple'}).length,
    1
  );
});
