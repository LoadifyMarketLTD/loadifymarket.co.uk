// Service Worker — no-op cleanup version.
// Clears all existing caches and unregisters itself so no cached content
// is ever served. All requests go directly to the network.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
      .then(() => self.registration.unregister())
  );
});
