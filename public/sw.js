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
      // NOTE: self.clients.claim() is intentionally omitted here.
      // Calling claim() after unregister() throws "Only the active worker can
      // claim clients" because the worker is no longer registered at that point.
      // Since we are unregistering (not replacing with a new version), there is
      // no need to claim clients — the browser will stop routing requests through
      // this worker on the next navigation.
  );
});
