// The legacy frontend registered a caching service worker at this URL; the current frontend
// has none. Browsers keep re-checking this script, so serve one that removes itself and its
// caches: until then every navigation and asset request went through the old worker, which
// copied each asset (multi-MB editor chunks included) into a cache that only ever grew.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister()),
  );
});
