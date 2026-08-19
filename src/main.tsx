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
import "./native.css";

// Initialise global error tracking (unhandled errors + unhandled rejections).
// Must be called before the React tree mounts so no early errors are missed.
initErrorTracking();

// Mark the native WebView once at bootstrap so native-only layout fixes can be
// scoped without changing the regular website or mobile browser experience.
if (isCapacitorContext()) {
  document.documentElement.classList.add('capacitor-native');
}

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

// Register the cleanup service worker so any previously cached responses are
// cleared and the old SW is unregistered. The SW itself does no caching.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal — ignore registration errors
    });
  });
}
