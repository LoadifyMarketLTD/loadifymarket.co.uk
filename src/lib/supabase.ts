import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. ' +
    'Add them to your .env file (see .env.example). ' +
    'For Android builds, add them as GitHub repository secrets — they are baked ' +
    'into the bundle at Vite build time and CANNOT be injected at runtime.'
  );
}

// Validate that supabaseUrl is a well-formed URL so that any configuration
// mistake (missing https://, stray quote, embedded newline, etc.) throws a
// clear error here rather than a cryptic "Invalid value" from the fetch API
// deep inside the Supabase client.
try {
  new URL(supabaseUrl);
} catch {
  throw new Error(
    `[Supabase] VITE_SUPABASE_URL is not a valid URL: "${supabaseUrl}". ` +
    'It must be a full https:// URL, e.g. https://<project-ref>.supabase.co'
  );
}

// Detect Capacitor native environment (window.Capacitor is injected by the
// native runtime before any JS runs in the WebView).
const isNative =
  typeof window !== 'undefined' && 'Capacitor' in window;

// Build a safe fetch reference that is always bound to `window` when running
// in a browser/WebView.  Passing an *unbound* global fetch (or `undefined`)
// to the Supabase client can trigger "Failed to execute 'fetch' on 'Window':
// Invalid value" in the Capacitor Android WebView because the fetch
// implementation requires `this === window`.  Using `.bind(window)` guarantees
// the correct receiver regardless of how the Supabase internals call it.
// The bare `fetch` fallback is only reached in non-browser SSR/test
// environments where there is no `window` at all; in those contexts the
// native fetch (Node ≥ 18) or a polyfill owns the binding itself.
const customFetch =
  typeof window !== 'undefined' && typeof window.fetch === 'function'
    ? window.fetch.bind(window)
    : fetch;

// In Capacitor with androidScheme:'https', the WebView runs under the
// https://localhost origin so window.localStorage is available and persistent.
// We pass it explicitly to ensure Supabase never falls back to an in-memory
// store (which loses the session on every cold start).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Always persist the session so cold-start restores the user instantly.
    persistSession: true,
    // Keep the access token fresh automatically.
    autoRefreshToken: true,
    // In a native Capacitor WebView the URL presented to the React app is
    // always the bundle origin (capacitor://localhost or https://localhost).
    // It will never carry Supabase auth fragments, so disable URL detection
    // to avoid false-positive session reads. On web this stays enabled so
    // magic-link and OAuth redirects work normally in the browser.
    detectSessionInUrl: !isNative,
    // Use localStorage explicitly so the storage key is predictable and
    // Supabase never silently downgrades to in-memory storage.
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    fetch: customFetch,
  },
});

