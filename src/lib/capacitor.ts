/**
 * Capacitor runtime utilities.
 *
 * Centralises the Capacitor environment check so that detection logic is not
 * duplicated across main.tsx (service-worker guard) and App.tsx (deep-link
 * handler guard).
 *
 * @capacitor/core attaches a `Capacitor` object to `window` before any
 * JavaScript runs inside the WebView, so this check is synchronous and safe
 * to call at module evaluation time.
 */

/** True when the page is running inside a native Capacitor iOS/Android shell. */
export const isCapacitorNative: boolean =
  typeof window !== 'undefined' && 'Capacitor' in window;
