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
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch((error) => {
          // Network request failed, return a fallback if available
          console.log('Fetch failed; returning offline page instead.', error);
          
          // For navigation requests, you could return a custom offline page here
          // For now, just let the error propagate
          return new Response('Network error occurred', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});
