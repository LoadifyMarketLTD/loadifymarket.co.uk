import { isCapacitorContext } from './capacitorUtils';

/**
 * Transport guard for the canonical checkout POST.
 *
 * Checkout is a privileged JSON API boundary. It must never accidentally fall
 * through to the SPA shell and hand `index.html` to a caller expecting JSON.
 * The site already exposes `/api/*` as a forced Netlify Function proxy; use that
 * route for this one request while preserving the current deploy origin on web
 * and the configured live backend when running inside the Capacitor WebView.
 *
 * This does not change checkout business rules, pricing, tax, Stripe ownership,
 * seller eligibility or payment semantics. It only makes transport deterministic
 * and converts an unexpected non-JSON upstream response into a controlled JSON
 * error so the UI never leaks a raw `Unexpected token '<'` parser exception.
 */

const NATIVE_NETLIFY_BASE = (
  (() => {
    const envBase = import.meta.env.VITE_APP_URL as string | undefined;
    const trimmed = typeof envBase === 'string' ? envBase.trim() : '';
    return trimmed || 'https://loadifymarket.co.uk';
  })()
).replace(/\/$/, '');

const CHECKOUT_FUNCTION_PATH = '/.netlify/functions/create-checkout';
const CHECKOUT_API_PATH = '/api/create-checkout';
const GUARD_MARKER = '__loadifyCheckoutFetchGuard';

type GuardedFetch = typeof fetch & { [GUARD_MARKER]?: true };

function isCheckoutPost(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (
    init?.method
    ?? (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')
  ).toUpperCase();
  if (method !== 'POST') return false;

  const rawUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (rawUrl === CHECKOUT_FUNCTION_PATH) return true;

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : NATIVE_NETLIFY_BASE;
    return new URL(rawUrl, base).pathname === CHECKOUT_FUNCTION_PATH;
  } catch {
    return false;
  }
}

function checkoutApiUrl(): string {
  if (isCapacitorContext()) {
    return `${NATIVE_NETLIFY_BASE}${CHECKOUT_API_PATH}`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${CHECKOUT_API_PATH}`;
  }
  return `${NATIVE_NETLIFY_BASE}${CHECKOUT_API_PATH}`;
}

function jsonFallbackResponse(response: Response): Response {
  const status = response.ok ? 502 : response.status;
  const message = response.ok
    ? 'Checkout returned an invalid response. Please try again.'
    : `Checkout is temporarily unavailable (${response.status}). Please try again.`;

  return new Response(JSON.stringify({ error: message }), {
    status,
    statusText: response.ok ? 'Bad Gateway' : response.statusText,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Install a narrow fetch wrapper for only the create-checkout POST.
 *
 * The installer is idempotent. It may be called again after `load` so a late
 * CapacitorHttp fetch injection cannot silently remove the guard.
 */
export function installCheckoutFetchGuard(): void {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

  const currentFetch = window.fetch as GuardedFetch;
  if (currentFetch[GUARD_MARKER]) return;

  const upstreamFetch: typeof fetch = window.fetch.bind(window);

  const guardedFetch: GuardedFetch = async (input, init) => {
    if (!isCheckoutPost(input, init)) {
      return upstreamFetch(input, init);
    }

    const response = await upstreamFetch(checkoutApiUrl(), init);
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

    if (contentType.includes('application/json') || contentType.includes('+json')) {
      return response;
    }

    console.error('checkoutFetchGuard: non-JSON checkout response blocked', {
      status: response.status,
      contentType: contentType || null,
    });

    return jsonFallbackResponse(response);
  };

  Object.defineProperty(guardedFetch, GUARD_MARKER, {
    value: true,
    enumerable: false,
    configurable: false,
  });

  window.fetch = guardedFetch;
}
