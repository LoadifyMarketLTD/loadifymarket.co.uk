import { createClient } from '@supabase/supabase-js';
import { isApkNative } from './apkDiagnostics';

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

// Android WebView (used by the Loadify APK) does not support the `keepalive`
// fetch option and throws "Failed to execute 'fetch' on 'Window': Invalid value"
// whenever it is present.  Strip it from every outgoing Supabase request so the
// client works identically on both web and the Android APK.
const mobileSafeFetch: typeof fetch = (input, init?) => {
  // DIAGNOSTIC (temporary): log every call so the APK log shows exactly what
  // options enter and exit this wrapper.  Uses console.warn so terser does not
  // strip it from the production bundle.  Remove once root cause is confirmed.
  const _native = isApkNative();
  if (_native) {
    const preKeys = init ? Object.keys(init).join(',') : '(none)';
    const hasKeepalive = init != null && 'keepalive' in init;
    console.warn(
      '[mobileSafeFetch] ENTER',
      `optKeys=[${preKeys}]`,
      `hasKeepalive=${hasKeepalive}`,
    );
  }

  if (init && 'keepalive' in init) {
    const { keepalive: _keepalive, ...rest } = init as RequestInit & { keepalive?: boolean };
    if (_native) {
      console.warn(
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

