import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
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

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      () => {
        // ServiceWorker registered successfully — silent in production
      },
      (err) => {
        console.error('ServiceWorker registration failed:', err);
      }
    );
  });
}
