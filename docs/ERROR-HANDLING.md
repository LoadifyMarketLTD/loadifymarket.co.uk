# Error Handling — Loadify Market

This document describes the complete error-handling and observability strategy for the Loadify Market platform.

---

## 1. Client-side (React SPA)

### 1.1 Global ErrorBoundary

`src/components/ErrorBoundary.tsx` wraps the entire React tree in `src/main.tsx`.

- Catches any unhandled render error thrown by any component.
- Calls `captureError()` from `src/lib/errorTracking.ts` so the error is forwarded to the `error-report` Netlify function in production.
- Shows a friendly fallback page with a "Go to Home Page" button that performs a full page reload to reset all state.

```tsx
// main.tsx — global wrapper
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### 1.2 SectionErrorBoundary

`src/components/SectionErrorBoundary.tsx` is a lightweight boundary for **individual below-the-fold sections**.

Use it around any `React.lazy()` chunk or data-fetching section that should not crash the entire page:

```tsx
import SectionErrorBoundary from '@/components/SectionErrorBoundary';
import { lazy, Suspense } from 'react';

const TrendingProducts = lazy(() => import('@/components/TrendingProducts'));

<SectionErrorBoundary>
  <Suspense fallback={<div className="h-40 animate-pulse bg-gray-100 rounded-xl" />}>
    <TrendingProducts />
  </Suspense>
</SectionErrorBoundary>
```

If the chunk fails to load (network error, stale deploy), the section shows a non-intrusive inline error instead of crashing the page.

### 1.3 Route-level Suspense

All page-level lazy imports in `src/App.tsx` are wrapped in `<Suspense fallback={<PageLoader />}>`. This prevents a blank screen while the JS chunk is being fetched.

### 1.4 Client-side error tracking (`src/lib/errorTracking.ts`)

Captures:
- `window.onerror` — unhandled JavaScript errors
- `window.unhandledrejection` — unhandled Promise rejections
- `ErrorBoundary.componentDidCatch` — React render errors

In **production**, every captured error is sent to `/.netlify/functions/error-report` using `navigator.sendBeacon` (fire-and-forget, survives page unload). In **development**, errors are logged to the console only.

---

## 2. Server-side (Netlify Functions)

### 2.1 Consistent error response shape

Every Netlify function returns errors in a consistent shape:

```json
{
  "error": "Human-readable message here"
}
```

With an appropriate HTTP status code:

| Status | Meaning |
|---|---|
| 400 | Missing or invalid request body |
| 401 | Missing or invalid auth token |
| 403 | Authenticated but insufficient role |
| 404 | Resource not found |
| 405 | Wrong HTTP method |
| 409 | Conflict (e.g. duplicate email) |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |
| 503 | Service not configured (missing env vars) |

### 2.2 Rate limiting

`netlify/functions/_shared/rateLimiter.ts` provides IP-based rate limiting for:
- `register` — prevents mass account creation
- `send-email` — prevents email flooding
- `error-report` — prevents log flooding (60 reports/hour/IP)

### 2.3 CSP violation reporting

`netlify/functions/csp-report.ts` receives browser Content-Security-Policy violation reports. Reports are logged to the function console and optionally persisted to the `csp_reports` table.

### 2.4 Stripe webhook safety

`netlify/functions/stripe-webhook.ts` verifies the Stripe signature on every incoming event. The `stripe_events` table provides idempotency — a `23505 UNIQUE` constraint prevents double-processing. Failed events are marked `status='failed'` for admin visibility.

---

## 3. Debugging: JS chunk failed to load

**Symptom:** Browser console shows `Failed to fetch dynamically imported module: SomeComponent-abc123.js`.

**Cause:** A stale browser cache is requesting a chunk hash that no longer exists after a new deploy.

### Resolution steps

1. **Verify the chunk URL**: paste the URL from the error into a browser tab.
   - `404` → stale cache; hard-reload (`Ctrl+Shift+R`) clears it.
   - `403` → server/CDN permissions issue.
   - `500` → CDN/origin configuration issue.

2. **Hard-reload in browser** (`Ctrl+Shift+R` / `Cmd+Shift+R`) to bypass the cache.

3. **Confirm a full build and deploy was completed**: incremental deploys can leave stale chunk references. Run:
   ```bash
   rm -rf dist
   npm run build
   ```
   Then redeploy.

4. **Wrap the section in SectionErrorBoundary** so the failure degrades gracefully rather than crashing the whole page (see section 1.2 above).

---

## 4. Observability summary

| Signal | Collection mechanism | Storage |
|---|---|---|
| React render errors | `ErrorBoundary.componentDidCatch` → `captureError()` | `error_reports` table |
| Unhandled JS errors | `window.error` → `captureError()` | `error_reports` table |
| Unhandled rejections | `window.unhandledrejection` → `captureError()` | `error_reports` table |
| CSP violations | Browser `report-uri` → `csp-report` function | `csp_reports` table |
| Stripe failures | Webhook → `stripe_events` table | `stripe_events` table |
| Function errors | Netlify function logs | Netlify dashboard |
