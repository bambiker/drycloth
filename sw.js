// Lets the site be installed as an app and open without internet (the forecast itself needs internet).
// It always tries the network first, so changes to the site show up right away.
const CACHE = 'drycloth-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {return;}
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      // offline: the saved copy (pages also with other parameters, e.g. ?fbclid=...)
      .catch(() => caches.match(request, { ignoreSearch: request.mode === 'navigate' }))
  );
});
