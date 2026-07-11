const RELEASE = '147';
const STATIC_CACHE = `osb-static-v${RELEASE}`;
const RUNTIME_CACHE = `osb-runtime-v${RELEASE}`;
const DATA_CACHE = `osb-data-v${RELEASE}`;
const CACHE_PREFIX = 'osb-';
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/offline.html",
  "/temples.html",
  "/sloka-library.html",
  "/festivals.html",
  "/ai-search.html",
  "/audio-library.html",
  "/sources.html",
  "/literature/thirumurugatruppadai.html",
  "/assets/css/osb44.css",
  "/assets/js/osb44.js",
  "/assets/js/pwa-register.js",
  "/favicon.svg",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/data/temples.json",
  "/data/slokas.json",
  "/data/festivals.json",
  "/data/sources.json",
  "/data/literature.json",
  "/data/content-publication.json",
  "/slokas/om-saravana-bhava.html",
  "/slokas/kanda-sashti-kavasam.html",
  "/slokas/subramanya-gayatri.html",
  "/slokas/vel-vel.html",
  "/festivals/thai-poosam.html",
  "/festivals/skanda-sashti.html",
  "/festivals/panguni-uthiram.html",
  "/festivals/aadi-krittikai.html",
  "/temples/thirupparamkundram.html",
  "/temples/thiruchendur.html",
  "/temples/palani.html",
  "/temples/swamimalai.html",
  "/temples/thiruthani.html",
  "/temples/pazhamudircholai.html"
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && ![STATIC_CACHE, RUNTIME_CACHE, DATA_CACHE].includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

const cacheResponse = async (cacheName, request, response) => {
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
};

const networkFirst = async request => {
  try {
    const response = await fetch(request);
    return cacheResponse(RUNTIME_CACHE, request, response);
  } catch (error) {
    return (await caches.match(request, {ignoreSearch: true})) || (await caches.match(OFFLINE_URL));
  }
};

const dataNetworkFirst = async request => {
  try {
    const response = await fetch(request);
    return cacheResponse(DATA_CACHE, request, response);
  } catch (error) {
    return (await caches.match(request)) || new Response('[]', {headers: {'Content-Type': 'application/json; charset=utf-8'}});
  }
};

const staleWhileRevalidate = async request => {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(response => cacheResponse(RUNTIME_CACHE, request, response))
    .catch(() => null);
  return cached || network || new Response('', {status: 504, statusText: 'Offline'});
};

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith('/data/') || request.destination === 'json') {
    event.respondWith(dataNetworkFirst(request));
    return;
  }

  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
