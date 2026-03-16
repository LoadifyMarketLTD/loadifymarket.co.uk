/**
 * Lightweight client-side error tracking for Loadify Market.
 *
 * Captures unhandled errors and promise rejections, enriches them with
 * context (URL, user agent, timestamp) and logs them to the browser
 * console. In production, errors are also sent to the `error-report`
 * Netlify function for server-side persistence and alerting.
 *
 * Design goals:
 *  - Zero external dependencies (no Sentry SDK, no third-party scripts).
 *  - Non-blocking: errors in the tracking path must never break the app.
 *  - Privacy-preserving: no PII is transmitted; stack traces are included
 *    only in development.
 */

export interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  context?: string;
}

const IS_PROD = import.meta.env.PROD;
const REPORT_ENDPOINT = '/.netlify/functions/error-report';

/**
 * Send an error report to the server (production only, fire-and-forget).
 */
function sendReport(report: ErrorReport): void {
  if (!IS_PROD) return;
  try {
    // Use sendBeacon when available (non-blocking, survives page unload).
    const payload = JSON.stringify(report);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(REPORT_ENDPOINT, new Blob([payload], { type: 'application/json' }));
    } else {
      fetch(REPORT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Swallow fetch errors — the app must not crash due to error reporting.
      });
    }
  } catch {
    // Never let error reporting throw.
  }
}

/**
 * Capture an error manually (e.g. from an ErrorBoundary or catch block).
 */
export function captureError(error: unknown, context?: string): void {
  const message =
    error instanceof Error ? error.message : String(error);
  const stack =
    error instanceof Error ? error.stack : undefined;

  const report: ErrorReport = {
    message,
    // Include stack traces in development only.
    stack: IS_PROD ? undefined : stack,
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    timestamp: new Date().toISOString(),
    context,
  };

  if (!IS_PROD) {
    console.error('[ErrorTracking]', report);
  }

  sendReport(report);
}

/**
 * Register global handlers for unhandled errors and unhandled promise
 * rejections. Call once at application startup (e.g. in main.tsx).
 *
 * Returns a cleanup function that removes the listeners.
 */
export function initErrorTracking(): () => void {
  const onError = (event: ErrorEvent) => {
    captureError(event.error ?? event.message, 'window.onerror');
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    captureError(event.reason, 'unhandledrejection');
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}
