const CACHE_NAME = 'osb-temple-experience-249c-v1';
const CORE_ASSETS = [
  'temple-experience.html',
  'assets/css/temple-encyclopedia.css',
  'assets/css/temple-experience.css',
  'assets/js/temple-experience-runtime.mjs',
  'data/temples/index.json',
  'data/manifests/experience-gallery.json',
  'data/manifests/experience-festivals.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('osb-temple-experience-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match('temple-experience.html')))
  );
});
