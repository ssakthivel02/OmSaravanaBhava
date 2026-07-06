const CACHE='osb-divine-v2';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE?caches.delete(k):null))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET') return; e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))); });
