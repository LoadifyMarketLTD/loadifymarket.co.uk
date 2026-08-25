import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { initErrorTracking } from "./lib/errorTracking.ts";
import { patchCapacitorFetch } from "./lib/capacitorFetchPatch.ts";
import { isCapacitorContext } from "./lib/capacitorUtils.ts";
import "./index.css";
import "./light-compat.css";
import "./native.css";

// Initialise global error tracking (unhandled errors + unhandled rejections).
// Must be called before the React tree mounts so no early errors are missed.
initErrorTracking();

// Mark the native WebView once at bootstrap so native-only layout fixes can be
// scoped without changing the regular website or mobile browser experience.
if (isCapacitorContext()) {
  document.documentElement.classList.add('capacitor-native');
}

// PR #592 visual cleanup must never affect the pre-existing /login design.
// Keep the global compatibility class disabled on /login and restore it on all
// other SPA routes. Header/Login.tsx themselves remain untouched.
const syncMarketLightScope = () => {
  const isLoginRoute = window.location.pathname === '/login';
  document.documentElement.classList.toggle('market-light-root', !isLoginRoute);
};

syncMarketLightScope();
window.addEventListener('popstate', syncMarketLightScope);

const originalPushState = window.history.pushState.bind(window.history);
window.history.pushState = (...args) => {
  originalPushState(...args);
  syncMarketLightScope();
};

const originalReplaceState = window.history.replaceState.bind(window.history);
window.history.replaceState = (...args) => {
  originalReplaceState(...args);
  syncMarketLightScope();
};

// On Capacitor APK, relative /.netlify/functions/ URLs resolve to
// https://localhost (the local WebView file server) instead of the Netlify
// backend.  This patch rewrites them to absolute URLs so every component
// fetch call reaches the live deployment without any per-file changes.
patchCapacitorFetch();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);

// App.tsx currently adds the compatibility class once at mount. Re-assert the
// route exclusion after React effects run so /login stays byte-for-byte styled
// by the pre-592 CSS/classes rather than by the compatibility layer.
queueMicrotask(syncMarketLightScope);
requestAnimationFrame(syncMarketLightScope);

// DEV-ONLY: Overflow detector to identify elements causing horizontal overflow
if (import.meta.env.DEV) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const viewportWidth = window.innerWidth;
      const offenders: Array<{ element: Element; selector: string; width: number; right: number }> = [];
      
      document.querySelectorAll('*').forEach((el) => {
        const rect = el.getBoundingClientRect();
        // Check if element extends beyond viewport
        if (rect.right > viewportWidth || rect.left < 0) {
          // Try to create a useful selector
          let selector = el.tagName.toLowerCase();
          if (el.id) selector += `#${el.id}`;
          if (el.className && typeof el.className === 'string') {
            const classes = el.className.split(' ').slice(0, 3).filter(c => c.trim());
            if (classes.length > 0) {
              selector += '.' + classes.join('.');
            }
          }
          
          offenders.push({
            element: el,
            selector,
            width: rect.width,
            right: rect.right,
          });
        }
      });
      
      if (offenders.length > 0) {
        console.warn(`⚠️ Found ${offenders.length} elements extending beyond viewport (${viewportWidth}px):`);
        offenders.slice(0, 10).forEach((offender, i) => {
          console.warn(`${i + 1}. ${offender.selector}`, {
            width: offender.width,
            right: offender.right,
            overflowBy: offender.right - viewportWidth,
            element: offender.element,
          });
          // Add visual indicator
          (offender.element as HTMLElement).style.outline = '2px solid red';
        });
      }
    }, 1000); // Wait for page to fully render
  });
}

// The service worker is a web/PWA concern, not part of the Capacitor runtime.
// Native builds already ship versioned web assets inside the APK; layering the
// PWA cache over those assets can keep stale bundles alive across app updates.
// Unregister any service worker left by an older APK, and remove only Loadify's
// own PWA caches. Regular web/PWA visitors continue to register /sw.js normally.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (isCapacitorContext()) {
      void navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .then(async () => {
          if (!('caches' in window)) return;
          const cacheNames = await window.caches.keys();
          await Promise.all(
            cacheNames
              .filter((name) => name.startsWith('loadify-'))
              .map((name) => window.caches.delete(name)),
          );
        })
        .catch(() => {
          // Cleanup is best-effort; a failure must not block native startup.
        });
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal — the website remains functional without offline caching.
    });
  });
}
