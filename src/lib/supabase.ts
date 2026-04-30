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

if (!supabaseUrl.startsWith('https://')) {
  throw new Error(
    `[Supabase] VITE_SUPABASE_URL must start with https://. Got scheme: "${supabaseUrl.split(':')[0]}://". ` +
    'Check the VITE_SUPABASE_URL secret in GitHub Actions → Settings → Secrets.'
  );
}

// Detect hidden characters (internal whitespace, embedded newlines, etc.) in
// the anon key.  Both values were .trim()-ed above, so any /\s/ match here
// indicates internal whitespace (e.g. a secret saved with an embedded newline)
// which will cause "Failed to construct 'Headers': Invalid value" at runtime.
if (/\s/.test(supabaseAnonKey)) {
  throw new Error(
    '[Supabase] Invalid Supabase anon key in APK build env: VITE_SUPABASE_ANON_KEY contains whitespace or newline. ' +
    'Edit the GitHub secret and ensure it is a single-line JWT with no surrounding quotes.'
  );
}

if (!supabaseAnonKey.startsWith('eyJ')) {
  throw new Error(
    '[Supabase] Invalid Supabase anon key in APK build env: VITE_SUPABASE_ANON_KEY does not start with "eyJ". ' +
    `First 10 chars: "${supabaseAnonKey.slice(0, 10)}". ` +
    'Check that the secret value is the full JWT anon key, not the project URL or service role key.'
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
  if (import.meta.env.DEV) {
    // Development-only diagnostics — never logged in production builds.
    const preKeys = init ? Object.keys(init).join(',') : '(none)';
    const hasKeepalive = init != null && 'keepalive' in init;
    console.debug(
      '[mobileSafeFetch CALLED]',
      String(input instanceof Request ? input.url : input).slice(0, 120),
      `optKeys=[${preKeys}]`,
      `hasKeepalive=${hasKeepalive}`,
    );
    console.debug('[FETCH HEADERS]', init?.headers);
  }

  if (init && 'keepalive' in init) {
    const { keepalive: _keepalive, ...rest } = init as RequestInit & { keepalive?: boolean };
    if (import.meta.env.DEV) {
      console.debug(
        '[mobileSafeFetch] STRIPPED keepalive',
        `remaining optKeys=[${Object.keys(rest).join(',') || '(none)'}]`,
      );
    }
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

