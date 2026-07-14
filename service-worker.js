const RELEASE = '215';
const STATIC_CACHE = `osb-static-v${RELEASE}`;
const RUNTIME_CACHE = `osb-runtime-v${RELEASE}`;
const DATA_CACHE = `osb-data-v${RELEASE}`;
const CACHE_PREFIX = 'osb-';
const OFFLINE_URL = '/offline.html';
const MAX_RUNTIME_ENTRIES = 60;
const MAX_DATA_ENTRIES = 20;

// Core shell failures are blocking. Optional editorial/module failures are logged
// individually so one missing page cannot invalidate the complete PWA install.
const CORE_PRECACHE_URLS = [
  "/",
  "/index.html",
  "/offline.html",
  "/404.html",
  "/assets/css/osb44.css",
  "/assets/js/pwa-register.js",
  "/favicon.svg",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/offline.html",
  "/404.html",
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
  "/temples/pazhamudircholai.html",
  "/thiruppugazh.html",
  "/data/thiruppugazh.json",
  "/thiruppugazh/0006-muththaiththaru.html",
  "/thiruppugazh/0007-arukku-mangkaiyar.html",
  "/thiruppugazh/0008-unaith-thinam.html",
  "/thiruppugazh/0009-karuvadaindhu.html",
  "/thiruppugazh/0010-karukkum-anjana.html",
  "/thiruppugazh/0012-kadhadarungkayal.html",
  "/thiruppugazh/0013-sandhadham-bandha.html",
  "/thiruppugazh/0015-thadakkai-pangkayam.html",
  "/thiruppugazh/0016-padhiththa-senchandha.html",
  "/thiruppugazh/0017-poruppurung.html",
  "/assets/js/read-aloud.js",
  "/assets/js/audio-library.js",
  "/data/audio-catalog.json",
  "/slokas/skanda-guru-kavasam.html",
  "/data/skanda-guru-kavasam.json",
  "/assets/js/media-session-player.js",
  "/data/read-aloud-playlist.json",
  "/assets/js/advanced-search.js",
  "/data/search-index.json",
  "/thiruppugazh/0011-kanakan-thiral.html",
  "/thiruppugazh/0014-saruvumpadi.html",
  "/thiruppugazh-volume-3.html",
  "/data/thiruppugazh-volumes.json",
  "/arupadai-veedu.html",
  "/data/arupadai-veedu.json",
  "/literature/kandar-anubhuti.html",
  "/data/kandar-anubhuti.json",
  "/literature/thirumurugatruppadai-complete.html",
  "/data/thirumurugatruppadai-sections.json",
  "/murugan-mantras.html",
  "/data/murugan-mantras.json",
  "/literature/kanda-sashti-kavasam-edition.html",
  "/data/kanda-sashti-kavasam-structure.json",
  "/literature/vel-maaral.html",
  "/data/vel-maaral.json",
  "/literature/shanmuga-kavasam.html",
  "/data/shanmuga-kavasam.json",
  "/literature/kandar-alangaram.html",
  "/data/kandar-alangaram.json",
  "/literature/kandar-andhadhi.html",
  "/data/kandar-andhadhi.json",
  "/literature/kandar-kalivenba.html",
  "/data/kandar-kalivenba.json",
  "/literature/vel-mayil-virutham.html",
  "/data/vel-mayil-virutham.json",
  "/knowledge-graph.html",
  "/data/knowledge-graph.json",
  "/assets/js/premium-interactions.js",
  "/audio-collections.html",
  "/data/audio-collections.json",
  "/assets/js/audio-collections.js",
  "/cross-references.html",
  "/data/cross-reference-aliases.json",
  "/assets/js/cross-reference-aliases.js",
  "/murugan-timeline.html",
  "/data/murugan-timeline.json",
  "/temple-encyclopedia.html",
  "/data/temple-profiles.json",
  "/siddhar-knowledge-graph.html",
  "/data/siddhar-knowledge-graph.json",
  "/murugan-map.html",
  "/data/murugan-map.json",
  "/festival-intelligence.html",
  "/data/festival-intelligence.json",
  "/assets/js/search-recommendations.js",
  "/data/search-recommendations.json",
  "/assets/js/reader-experience.js",
  "/platform.html",
  "/data/platform-status.json",
  "/assets/js/desktop-layout.js",
  "/content-status.html",
  "/data/content-status.json",
  "/source-catalog.html",
  "/data/source-catalog.json",
  "/publication-history.html",
  "/data/publication-history.json",
  "/learning-center.html",
  "/data/learning-paths.json",
  "/learning-quiz.html",
  "/data/learning-quiz.json",
  "/assets/js/learning-quiz.js",
  "/pilgrimage-planner.html",
  "/data/pilgrimage-planner.json",
  "/daily-devotional.html",
  "/data/daily-devotional.json",
  "/assets/js/daily-devotional.js",
  "/privacy.html",
  "/data/privacy-preferences.json",
  "/assets/js/privacy-preferences.js",
  "/production-audit.html",
  "/data/production-audit.json",
  "/thiruppugazh-volume-4.html",
  "/thiruppugazh-volume-5.html",
  "/skanda-purana-graph.html",
  "/data/skanda-purana-graph.json",
  "/temple-research-dashboard.html",
  "/siddhar-literature.html",
  "/data/siddhar-literature-index.json",
  "/audio-albums.html",
  "/data/audio-albums.json",
  "/knowledge-graph-phase-3.html",
  "/learning-paths.html",
  "/research-library.html",
  "/data/research-library.json",
  "/version-3.html",
  "/data/version-3-status.json",
  "/thiruppugazh-volume-6.html",
  "/thiruppugazh-volume-7.html",
  "/temple-travel-guidance.html",
  "/knowledge-graph-phase-4.html",
  "/devotional-dictionary.html",
  "/data/devotional-dictionary.json",
  "/murugan-timeline-v2.html",
  "/assets/js/timeline-filter.js",
  "/siddhar-encyclopedia.html",
  "/data/siddhar-encyclopedia.json",
  "/panchangam-framework.html",
  "/data/panchangam-framework.json",
  "/data/search-concepts.json",
  "/assets/js/search-concepts.js",
  "/assets/js/premium-home.js",
  "/site-directory.html",
  "/data/site-routes.json",
  "/assets/js/site-directory.js",
  "/assets/css/site-directory.css",
  "/assets/js/404-suggestions.js",
  "/explore.html",
  "/data/navigation-sections.json",
  "/assets/js/explore-navigation.js",
  "/search-facets.html",
  "/assets/css/search-facets.css",
  "/assets/js/search-facets.mjs"
];

const cacheOptionalAssets = async cache => {
  const optionalUrls = PRECACHE_URLS.filter(url => !CORE_PRECACHE_URLS.includes(url));
  const failures = [];
  await Promise.all(optionalUrls.map(async url => {
    try {
      const response = await fetch(url, {cache: 'reload'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await cache.put(url, response);
    } catch (error) {
      failures.push(url);
      console.warn(`[OmSaravanaBhava] Optional precache skipped: ${url}`, error);
    }
  }));
  if (failures.length) {
    console.warn(`[OmSaravanaBhava] ${failures.length} optional asset(s) were not precached.`, failures);
  }
};

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(CORE_PRECACHE_URLS);
    await cacheOptionalAssets(cache);
  })());
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

const trimCache = async (cacheName, maxEntries) => {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  const excess = requests.length - maxEntries;
  if (excess <= 0) return;
  await Promise.all(requests.slice(0, excess).map(request => cache.delete(request)));
};

const cacheResponse = async (cacheName, request, response, maxEntries) => {
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    if (maxEntries) await trimCache(cacheName, maxEntries);
  }
  return response;
};

const networkFirst = async request => {
  try {
    const response = await fetch(request);
    if (response.status >= 500) throw new Error(`Server error: ${response.status}`);
    return cacheResponse(RUNTIME_CACHE, request, response, MAX_RUNTIME_ENTRIES);
  } catch (error) {
    return (await caches.match(request, {ignoreSearch: true})) ||
      (await caches.match(OFFLINE_URL));
  }
};

const dataNetworkFirst = async request => {
  try {
    const response = await fetch(request);
    if (!response.ok) throw new Error(`Data error: ${response.status}`);
    return cacheResponse(DATA_CACHE, request, response, MAX_DATA_ENTRIES);
  } catch (error) {
    return (await caches.match(request)) ||
      new Response('[]', {
        headers: {'Content-Type': 'application/json; charset=utf-8'}
      });
  }
};

const staleWhileRevalidate = async request => {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(response => cacheResponse(RUNTIME_CACHE, request, response, MAX_RUNTIME_ENTRIES))
    .catch(() => null);
  return cached || network || new Response('', {
    status: 504,
    statusText: 'Offline'
  });
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

  if (url.pathname.startsWith('/data/')) {
    event.respondWith(dataNetworkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
