import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. ' +
    'Add them to your .env file (see .env.example).'
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

// Primary fix for Android WebView network failures: CapacitorHttp is enabled in
// capacitor.config.ts (plugins.CapacitorHttp.enabled = true).  This routes all
// window.fetch calls through the native Android HTTP client, bypassing every
// WebView-specific limitation (CORS from https://localhost origin, keepalive
// support gaps, WebView SSL quirks, etc.).
//
// Secondary defence: strip the `keepalive` option from every Supabase request.
// Android WebView throws "Failed to execute 'fetch' on 'Window': Invalid value"
// if `keepalive` is present, even without CapacitorHttp.  Keeping the strip
// ensures the APK works safely across Capacitor versions and WebView builds.
const mobileSafeFetch: typeof fetch = (input, init?) => {
  // DIAGNOSTIC (temporary): unconditional console.error so the call appears
  // in logcat on every platform (APK, mobile browser, desktop DevTools).
  // Uses console.error to survive terser's pure_funcs drop_console config.
  // Remove once root cause is confirmed.
  const preKeys = init ? Object.keys(init).join(',') : '(none)';
  const hasKeepalive = init != null && 'keepalive' in init;
  console.error(
    '[mobileSafeFetch CALLED]',
    String(input instanceof Request ? input.url : input).slice(0, 120),
    `optKeys=[${preKeys}]`,
    `hasKeepalive=${hasKeepalive}`,
  );

  if (init && 'keepalive' in init) {
    const { keepalive: _keepalive, ...rest } = init as RequestInit & { keepalive?: boolean };
    console.error(
      '[mobileSafeFetch] STRIPPED keepalive',
      `remaining optKeys=[${Object.keys(rest).join(',') || '(none)'}]`,
    );
    return fetch(input, rest);
  }
  return fetch(input, init);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Detect session tokens in the URL so magic-link, OAuth, and
    // password-reset redirects work correctly in the browser.
    detectSessionInUrl: true,
    // Use localStorage explicitly so the storage key is predictable and
    // Supabase never silently downgrades to in-memory storage.
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    // Use the mobile-safe fetch wrapper defined above.
    fetch: mobileSafeFetch,
  },
});

