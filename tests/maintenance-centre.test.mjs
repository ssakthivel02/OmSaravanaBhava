import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  RELEASE,
  auditPaths,
  clearTransientCaches,
  evaluateAuditConfig,
  evaluateCheckPayload,
  evaluateJsonEquals,
  evaluateRouteRegistry,
  evaluateTextCount,
  normaliseSameOriginPath,
  readJsonPath,
  runResourceCheck,
  summariseResults
} from '../assets/js/maintenance-centre.mjs';

const registry = JSON.parse(
  fs.readFileSync(
    new URL('../data/maintenance-checks.json', import.meta.url),
    'utf8'
  )
);

test('release and registry identities are stable', () => {
  assert.equal(RELEASE, 222);
  assert.equal(registry.release, 222);
  assert.equal(registry.builtAgainstCommit.length, 40);
  assert.equal(registry.checks.length, 8);
});

test('same-origin path normalisation rejects external resources', () => {
  assert.equal(
    normaliseSameOriginPath('maintenance.html'),
    '/maintenance.html'
  );
  assert.equal(
    normaliseSameOriginPath(
      'https://omsaravanabhava.org/data/site-routes.json'
    ),
    '/data/site-routes.json'
  );
  assert.equal(
    normaliseSameOriginPath('https://example.com/file.json'),
    ''
  );
});

test('JSON path lookup and equality checks are deterministic', () => {
  const value = {release: 222, nested: {state: 'ready'}};
  assert.equal(readJsonPath(value, 'nested.state'), 'ready');
  assert.equal(readJsonPath(value, 'nested.missing'), undefined);
  assert.deepEqual(
    evaluateJsonEquals(value, 'release', 222),
    {ok: true, actual: 222}
  );
});

test('route registry requires one maintenance route and no duplicates', () => {
  const valid = evaluateRouteRegistry({
    release: 222,
    routes: [
      {path: '/index.html'},
      {path: '/discovery.html'}
    ]
  }, 222, '/discovery.html');
  assert.equal(valid.ok, true);

  const duplicate = evaluateRouteRegistry({
    release: 222,
    routes: [
      {path: '/discovery.html'},
      {path: '/discovery.html'}
    ]
  }, 222, '/discovery.html');
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.actual.duplicateCount, 1);
});

test('audit configuration requires the current release and files', () => {
  const result = evaluateAuditConfig({
    expectedRelease: '222',
    requiredFiles: ['discovery.html', 'manifest-release-222.json']
  }, '222', ['discovery.html', 'manifest-release-222.json']);
  assert.equal(result.ok, true);

  const missing = evaluateAuditConfig({
    expectedRelease: '222',
    requiredFiles: ['discovery.html']
  }, '222', ['discovery.html', 'manifest-release-222.json']);
  assert.equal(missing.ok, false);
  assert.deepEqual(
    missing.actual.missing,
    ['manifest-release-222.json']
  );
});

test('text count checks require exactly one sitemap entry', () => {
  assert.deepEqual(
    evaluateTextCount(
      '<loc>maintenance</loc>',
      'maintenance',
      1
    ),
    {ok: true, actual: 1}
  );
  assert.equal(
    evaluateTextCount(
      'maintenance maintenance',
      'maintenance',
      1
    ).ok,
    false
  );
});

test('check payload supports all configured check modes', () => {
  const routeCheck = registry.checks.find(
    check => check.mode === 'routeRegistry'
  );
  const result = evaluateCheckPayload(
    routeCheck,
    JSON.stringify({
      release: 222,
      routes: [{path: '/discovery.html'}]
    })
  );
  assert.equal(result.ok, true);
});

test('resource checks record HTTP and marker results', async () => {
  const fetcher = async path => ({
    ok: true,
    status: 200,
    async text() {
      return path === '/service-worker.js'
        ? "const RELEASE = '222';"
        : '';
    }
  });
  const result = await runResourceCheck({
    path: '/service-worker.js',
    mode: 'textIncludes',
    expected: "const RELEASE = '222';"
  }, fetcher);
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
});

test('path auditing preserves independent failures', async () => {
  const fetcher = async path => {
    if (path.includes('missing')) {
      throw new Error('network');
    }
    return {ok: true, status: 200};
  };
  const results = await auditPaths([
    '/index.html',
    '/missing.html',
    '/index.html'
  ], fetcher, 2);
  assert.equal(results.length, 2);
  assert.equal(results[0].ok, true);
  assert.equal(results[1].ok, false);
  assert.deepEqual(summariseResults(results), {
    total: 2,
    passed: 1,
    failed: 1,
    status: 'FAIL'
  });
});

test('transient cache cleanup preserves static and user caches', async () => {
  const names = [
    'osb-static-v222',
    'osb-runtime-v220',
    'osb-data-v219',
    'osb-user-reading-v1'
  ];
  const deletedNames = [];
  const storage = {
    async keys() { return names; },
    async delete(name) {
      deletedNames.push(name);
      return true;
    }
  };
  const result = await clearTransientCaches(storage);
  assert.deepEqual(result.deleted, [
    'osb-runtime-v220',
    'osb-data-v219'
  ]);
  assert.deepEqual(deletedNames, [
    'osb-runtime-v220',
    'osb-data-v219'
  ]);
});
