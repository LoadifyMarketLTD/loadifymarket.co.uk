import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { initApkFetchDiagnostics } from "./lib/apkDiagnostics.ts";
import { initErrorTracking } from "./lib/errorTracking.ts";
import "./index.css";

// TEMPORARY: Patch window.fetch before anything else so every outgoing request
// is logged in the APK.  Must run first so the patch is in place before the
// Supabase client or error-tracking code makes any fetch calls.
// Remove once the "Failed to execute 'fetch' on 'Window': Invalid value" root
// cause is confirmed.
initApkFetchDiagnostics();

// Initialise global error tracking (unhandled errors + unhandled rejections).
// Must be called before the React tree mounts so no early errors are missed.
initErrorTracking();

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
