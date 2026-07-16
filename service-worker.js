const RELEASE = '240';
const CACHE_PREFIX = 'osb-';
const STATIC_CACHE = `${CACHE_PREFIX}static-v${RELEASE}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-v${RELEASE}`;
const DATA_CACHE = `${CACHE_PREFIX}data-v${RELEASE}`;
const USER_READING_CACHE = 'osb-user-reading-v1';
const OFFLINE_URL = '/offline.html';
const MAX_RUNTIME_ENTRIES = 80;
const MAX_DATA_ENTRIES = 40;

const CORE_PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/404.html',
  '/assets/css/osb44.css',
  '/assets/js/pwa-register.js',
  '/favicon.svg',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

const FEATURE_PRECACHE_URLS = [
  '/content-status.html',
  '/discovery.html',
  '/site-directory.html',
  '/assets/css/content-status-audit.css',
  '/assets/css/discovery-workspace.css',
  '/assets/css/site-directory.css',
  '/assets/css/route-status-reconciliation.css',
  '/assets/js/effective-route-registry.mjs',
  '/assets/js/content-status-audit.mjs',
  '/assets/js/discovery-workspace.mjs',
  '/assets/js/site-directory.mjs',
  '/assets/js/route-status-reconciliation.js',
  '/data/content-status.json',
  '/data/discovery-lenses.json',
  '/data/navigation-sections.json',
  '/data/publication-boundaries.json',
  '/data/site-routes.json',
  '/data/site-routes-effective-overrides.json',
  '/data/effective-route-registry-runtime.json'
];

const trimCache = async (cacheName, maximum) => {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  const excess = requests.length - maximum;
  if (excess <= 0) return;
  await Promise.all(
    requests.slice(0, excess).map(request => cache.delete(request))
  );
};

const cacheResponse = async (
  cacheName,
  request,
  response,
  maximum
) => {
  if (
    response &&
    response.ok &&
    ['basic', 'cors'].includes(response.type)
  ) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    if (maximum) await trimCache(cacheName, maximum);
  }
  return response;
};

const cacheOptionalAssets = async cache => {
  const failures = [];
  await Promise.all(
    FEATURE_PRECACHE_URLS.map(async url => {
      try {
        const response = await fetch(url, {cache: 'reload'});
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        await cache.put(url, response);
      } catch (error) {
        failures.push(url);
        console.warn(
          `[OmSaravanaBhava] Optional Release ${RELEASE} precache skipped: ${url}`,
          error
        );
      }
    })
  );
  if (failures.length) {
    console.warn(
      `[OmSaravanaBhava] ${failures.length} optional Release ${RELEASE} asset(s) were not precached.`,
      failures
    );
  }
};

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(CORE_PRECACHE_URLS);
    await cacheOptionalAssets(cache);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([
      STATIC_CACHE,
      RUNTIME_CACHE,
      DATA_CACHE,
      USER_READING_CACHE
    ]);
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith(CACHE_PREFIX) && !keep.has(key))
        .map(key => caches.delete(key))
    );
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }
    await self.clients.claim();
  })());
});

const networkFirst = async (request, preloadResponse) => {
  try {
    const response =
      await preloadResponse ||
      await fetch(request, {cache: 'no-store'});
    if (!response.ok && response.status >= 500) {
      throw new Error(`HTTP ${response.status}`);
    }
    return cacheResponse(
      RUNTIME_CACHE,
      request,
      response,
      MAX_RUNTIME_ENTRIES
    );
  } catch (error) {
    return (
      await caches.match(request, {ignoreSearch: true}) ||
      await caches.match(OFFLINE_URL) ||
      new Response('Offline', {
        status: 503,
        headers: {'Content-Type': 'text/plain; charset=utf-8'}
      })
    );
  }
};

const dataNetworkFirst = async request => {
  try {
    const response = await fetch(request, {cache: 'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return cacheResponse(
      DATA_CACHE,
      request,
      response,
      MAX_DATA_ENTRIES
    );
  } catch (error) {
    return (
      await caches.match(request) ||
      new Response('{"offline":true}', {
        status: 503,
        headers: {'Content-Type': 'application/json; charset=utf-8'}
      })
    );
  }
};

const staleWhileRevalidate = async request => {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(response => cacheResponse(
      RUNTIME_CACHE,
      request,
      response,
      MAX_RUNTIME_ENTRIES
    ))
    .catch(() => null);
  return (
    cached ||
    await network ||
    new Response('', {status: 504, statusText: 'Offline'})
  );
};

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, event.preloadResponse)
    );
    return;
  }

  if (url.pathname.startsWith('/data/')) {
    event.respondWith(dataNetworkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_RUNTIME_CACHES') {
    event.waitUntil(Promise.all([
      caches.delete(RUNTIME_CACHE),
      caches.delete(DATA_CACHE)
    ]));
  }
});
