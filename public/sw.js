// Loadify Market — Progressive Web App Service Worker
//
// Caching strategy:
//   /assets/*             Cache-first (Vite content-hashed JS/CSS bundles — immutable)
//   fonts.gstatic.com     Cache-first (woff2 font files — immutable)
//   fonts.googleapis.com  Network pass-through (honours page CSP style loading)
//   Everything else       Network-first with cache fallback
//
// API calls (Supabase, Netlify Functions, Stripe, Google Analytics) are always
// passed directly to the network and never cached.
//
// Bump CACHE_NAME when deploying a breaking change to force cache eviction.

const CACHE_NAME = 'loadify-v1';

// ── Install: activate immediately without waiting for existing clients ────────
self.addEventListener('install', () => {
  self.skipWaiting();
});

// ── Activate: evict stale caches from previous SW versions ───────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true for requests that must always bypass the cache. */
function isApiCall(url) {
  return (
    url.hostname.endsWith('.supabase.co') ||
    url.pathname.startsWith('/.netlify/functions/') ||
    url.hostname === 'js.stripe.com' ||
    url.hostname === 'api.stripe.com' ||
    url.hostname.includes('google-analytics.com') ||
    url.hostname.includes('googletagmanager.com')
  );
}

/** Returns true for resources that should be served cache-first. */
function isCacheFirst(url) {
  // Vite outputs content-hashed filenames into /assets/ — safe to cache forever.
  if (url.pathname.startsWith('/assets/')) return true;
  // Google Fonts woff2 files and font CSS are versioned by URL — cache forever.
  if (url.hostname === 'fonts.gstatic.com') return true;
  return false;
}

// ── Fetch: route requests through the appropriate strategy ────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET requests over HTTP(S).
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (!url.protocol.startsWith('http')) return;

  // Always network for API and third-party analytics.
  if (isApiCall(url)) return;

  if (isCacheFirst(url)) {
    // ── Cache-first ───────────────────────────────────────────────────────────
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached ?? new Response('', { status: 504, statusText: 'Gateway Timeout' }));
        }),
      ),
    );
    return;
  }

  // ── Network-first with cache fallback (SPA shell, public images, icons) ──────
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
