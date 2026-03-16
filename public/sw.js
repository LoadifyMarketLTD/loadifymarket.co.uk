// Service Worker for Loadify Market PWA
const CACHE_NAME = 'loadify-market-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.webmanifest',
  // Note: PNG icons should be generated from favicon.svg for full PWA support
  // For now, using SVG as fallback
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Try to cache all URLs, but don't fail if some are missing
        return Promise.all(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.log(`Failed to cache ${url}:`, err);
              return Promise.resolve();
            })
          )
        );
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when possible, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle http/https requests — skip chrome-extension://, data:, etc.
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Only handle same-origin requests.
  // Cross-origin requests (Google Fonts, Unsplash images, Stripe, Supabase …)
  // must be handled directly by the browser so the correct CSP directives
  // (style-src, img-src, connect-src) are applied rather than going through
  // the service-worker's fetch() which is evaluated against connect-src.
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Clone the request
        const fetchRequest = request.clone();

        return fetch(fetchRequest).then(
          (networkResponse) => {
            // Only cache valid, same-origin, basic responses
            if (
              !networkResponse ||
              networkResponse.status !== 200 ||
              networkResponse.type !== 'basic'
            ) {
              return networkResponse;
            }

            // Clone the response before consuming it
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return networkResponse;
          }
        ).catch((error) => {
          // Network request failed, return a generic error response
          console.log('Fetch failed; returning offline page instead.', error);
          return new Response('Network error occurred', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});
