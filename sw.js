const OSB_CACHE = 'om-saravana-bhava-v6c';
const CORE_ASSETS = [
  './', './index.html', './styles.css', './script.js', './offline.html', './manifest.json',
  './temples.html', './festivals.html', './slokas.html', './search.html', './daily.html', './quiz.html',
  './data/app_config.json', './data/temples.json', './data/festivals.json', './data/slokas.json'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(OSB_CACHE).then(cache => cache.addAll(CORE_ASSETS.filter(Boolean))).catch(() => null));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== OSB_CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(OSB_CACHE).then(cache => cache.put(event.request, copy)).catch(() => null);
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./offline.html'))));
});
