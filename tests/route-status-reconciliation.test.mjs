import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const scriptText = await readFile(
  new URL('../assets/js/route-status-reconciliation.js', import.meta.url),
  'utf8'
);
const context = {
  URL,
  Headers,
  Request,
  Response,
  console,
  globalThis: null
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(scriptText, context);
const policy = context.OSBRouteStatusPolicy;

const readJson = async relative => JSON.parse(
  await readFile(new URL(relative, import.meta.url), 'utf8')
);

const sampleRoutes = {
  release: 228,
  routes: [
    {
      path: '/literature/kandar-anubhuti.html',
      titleEn: 'Kandar Anubhuti',
      status: 'published',
      summary: 'Generic published summary.'
    },
    {
      path: '/literature/kandar-alangaram.html',
      titleEn: 'Kandar Alangaram',
      status: 'published',
      summary: 'Generic published summary.'
    },
    {
      path: '/temples/palani.html',
      titleEn: 'Palani',
      status: 'published',
      summary: 'Temple route.'
    }
  ]
};

const sampleBoundaries = {
  release: 231,
  records: [
    {
      route: '/literature/kandar-anubhuti.html',
      declaredRouteStatus: 'published',
      verifiedStatus: 'partial-reviewed',
      readingEligible: true,
      contentScope: 'Opening protection verse and verse 1 only.'
    },
    {
      route: '/literature/kandar-alangaram.html',
      declaredRouteStatus: 'published',
      verifiedStatus: 'source-register',
      readingEligible: false,
      contentScope: 'Literary identity register only.'
    }
  ]
};

test('classic bootstrap exposes Release 231 policy without patching Node fetch', () => {
  assert.ok(policy);
  assert.equal(policy.RELEASE, 231);
  assert.equal(policy.ROUTES_PATH, '/data/site-routes.json');
  assert.equal(policy.BOUNDARIES_PATH, '/data/publication-boundaries.json');
});

test('route normalisation accepts same-origin paths and rejects external URLs', () => {
  assert.equal(
    policy.normaliseRoute('/literature/kandar-anubhuti.html'),
    '/literature/kandar-anubhuti.html'
  );
  assert.equal(
    policy.normaliseRoute('https://example.com/foreign.html'),
    ''
  );
});

test('boundary map contains unique canonical routes', () => {
  const map = policy.buildBoundaryMap(sampleBoundaries);
  assert.equal(map.size, 2);
  assert.equal(
    map.get('/literature/kandar-alangaram.html').verifiedStatus,
    'source-register'
  );
});

test('canonical overlay updates status, scope and provenance', () => {
  const result = policy.applyCanonicalStatuses(
    sampleRoutes,
    sampleBoundaries
  );
  const anubhuti = result.routes.find(
    route => route.path === '/literature/kandar-anubhuti.html'
  );
  assert.equal(result.effectiveRelease, 231);
  assert.equal(result.reconciliation.reconciledCount, 2);
  assert.equal(anubhuti.status, 'partial-reviewed');
  assert.equal(anubhuti.publicationStatusPrevious, 'published');
  assert.equal(anubhuti.publicationStatusCanonical, 'partial-reviewed');
  assert.equal(anubhuti.readingEligible, true);
  assert.equal(
    anubhuti.summary,
    'Opening protection verse and verse 1 only.'
  );
});

test('source-register route remains visible metadata but is reading-ineligible', () => {
  const result = policy.applyCanonicalStatuses(
    sampleRoutes,
    sampleBoundaries
  );
  const alangaram = result.routes.find(
    route => route.path === '/literature/kandar-alangaram.html'
  );
  assert.equal(alangaram.status, 'source-register');
  assert.equal(alangaram.readingEligible, false);
});

test('unregistered routes remain semantically unchanged', () => {
  const result = policy.applyCanonicalStatuses(
    sampleRoutes,
    sampleBoundaries
  );
  const palani = result.routes.find(
    route => route.path === '/temples/palani.html'
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(palani)),
    sampleRoutes.routes[2]
  );
});

test('overlay does not mutate input registries', () => {
  const beforeRoutes = JSON.stringify(sampleRoutes);
  const beforeBoundaries = JSON.stringify(sampleBoundaries);
  policy.applyCanonicalStatuses(sampleRoutes, sampleBoundaries);
  assert.equal(JSON.stringify(sampleRoutes), beforeRoutes);
  assert.equal(JSON.stringify(sampleBoundaries), beforeBoundaries);
});

test('request classifier reconciles only the same-origin route registry', () => {
  assert.equal(policy.shouldReconcileRequest('/data/site-routes.json'), true);
  assert.equal(
    policy.shouldReconcileRequest(
      'https://omsaravanabhava.org/data/site-routes.json'
    ),
    true
  );
  assert.equal(
    policy.shouldReconcileRequest('/data/publication-boundaries.json'),
    false
  );
  assert.equal(
    policy.shouldReconcileRequest('https://example.com/data/site-routes.json'),
    false
  );
});

test('transition labels preserve historical correction evidence', () => {
  assert.equal(
    policy.transitionLabel(sampleBoundaries.records[0]),
    'published → partial-reviewed'
  );
  assert.equal(
    policy.transitionLabel({verifiedStatus: 'navigation'}),
    'navigation'
  );
});

test('production boundary registry has eight audited records and three consumers', async () => {
  const payload = await readJson('../data/publication-boundaries.json');
  assert.equal(payload.release, 231);
  assert.equal(payload.records.length, 8);
  assert.equal(new Set(payload.records.map(item => item.route)).size, 8);
  assert.deepEqual(payload.propagation.consumerRoutes, [
    '/content-status.html',
    '/discovery.html',
    '/site-directory.html'
  ]);
});

test('seven audited routes remain reading-ineligible and one bounded extract remains eligible', async () => {
  const payload = await readJson('../data/publication-boundaries.json');
  assert.equal(
    payload.records.filter(record => record.readingEligible === false).length,
    7
  );
  const eligible = payload.records.filter(
    record => record.readingEligible !== false
  );
  assert.equal(eligible.length, 1);
  assert.equal(eligible[0].route, '/literature/kandar-anubhuti.html');
  assert.equal(eligible[0].verifiedStatus, 'partial-reviewed');
});

test('Content Status configuration identifies effective runtime mode', async () => {
  const config = await readJson('../data/content-status.json');
  assert.equal(config.release, 231);
  assert.equal(config.mode, 'runtime-derived-effective');
  assert.equal(
    config.reconciliationScript,
    '/assets/js/route-status-reconciliation.js'
  );
  assert.equal(config.historicalRouteRegistryPreserved, true);
  assert.equal('statusCounts' in config, false);
});

test('consumer pages load reconciliation synchronously before their renderers', async () => {
  const cases = [
    ['../content-status.html', 'assets/js/content-status-audit.mjs'],
    ['../discovery.html', 'assets/js/discovery-workspace.mjs'],
    ['../site-directory.html', 'assets/js/site-directory.js']
  ];
  for (const [relative, consumer] of cases) {
    const html = await readFile(new URL(relative, import.meta.url), 'utf8');
    const policyIndex = html.indexOf('assets/js/route-status-reconciliation.js');
    const consumerIndex = html.indexOf(consumer);
    assert.ok(policyIndex >= 0, `${relative} policy script missing`);
    assert.ok(consumerIndex > policyIndex, `${relative} consumer order invalid`);
    assert.ok(html.includes('data-release="231"'));
    assert.ok(html.includes('assets/css/route-status-reconciliation.css'));
  }
});

test('service worker precaches Release 231 assets exactly once without cache migration', async () => {
  const source = await readFile(
    new URL('../service-worker.js', import.meta.url),
    'utf8'
  );
  assert.ok(source.includes("const RELEASE = '228';"));
  for (const asset of [
    '/assets/css/route-status-reconciliation.css',
    '/assets/js/route-status-reconciliation.js',
    '/manifest-release-231.json'
  ]) {
    assert.equal(source.split(`"${asset}"`).length - 1, 1, asset);
  }
});

test('new production script has no storage, tracking or content-generation operation', () => {
  for (const forbidden of [
    'localStorage.setItem',
    'sessionStorage.setItem',
    'indexedDB.open',
    'navigator.sendBeacon',
    'gtag(',
    'mixpanel',
    'generateVerse',
    'innerHTML ='
  ]) {
    assert.equal(scriptText.includes(forbidden), false, forbidden);
  }
});

test('browser bootstrap intercepts the route registry and returns a reconciled Response', async () => {
  const calls = [];
  const browserContext = {
    URL,
    Headers,
    Request,
    Response,
    console,
    location: {origin: 'https://omsaravanabhava.org'},
    document: {
      readyState: 'loading',
      documentElement: {dataset: {}},
      addEventListener() {}
    },
    MutationObserver: class {
      observe() {}
    },
    CustomEvent: class {
      constructor(type, options) {
        this.type = type;
        this.detail = options?.detail;
      }
    },
    dispatchEvent() {},
    fetch: async input => {
      const url = new URL(
        typeof input === 'string' ? input : input.url,
        'https://omsaravanabhava.org/'
      );
      calls.push(url.pathname);
      if (url.pathname === '/data/publication-boundaries.json') {
        return new Response(JSON.stringify(sampleBoundaries), {
          status: 200,
          headers: {'content-type': 'application/json'}
        });
      }
      if (url.pathname === '/data/site-routes.json') {
        return new Response(JSON.stringify(sampleRoutes), {
          status: 200,
          headers: {'content-type': 'application/json'}
        });
      }
      return new Response('not found', {status: 404});
    },
    globalThis: null,
    window: null
  };
  browserContext.globalThis = browserContext;
  browserContext.window = browserContext;
  vm.createContext(browserContext);
  vm.runInContext(scriptText, browserContext);
  const response = await browserContext.fetch('/data/site-routes.json');
  const payload = await response.json();
  assert.equal(response.headers.get('x-osb-publication-status-release'), '231');
  assert.equal(payload.reconciliation.reconciledCount, 2);
  assert.equal(
    payload.routes.find(
      route => route.path === '/literature/kandar-alangaram.html'
    ).status,
    'source-register'
  );
  assert.deepEqual(calls.sort(), [
    '/data/publication-boundaries.json',
    '/data/site-routes.json'
  ]);
});

