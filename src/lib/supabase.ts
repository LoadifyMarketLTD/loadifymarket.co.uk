import { createClient } from '@supabase/supabase-js';
import type { SupportedStorage } from '@supabase/supabase-js';
import { isCapacitorNative } from './capacitorUtils';
import { protectCurrentDevicePushBeforeSignOut } from './secureSignOut';

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
// the public client key. Both values were .trim()-ed above, so any /\s/ match
// here indicates internal whitespace which will cause invalid request headers.
if (/\s/.test(supabaseAnonKey)) {
  throw new Error(
    '[Supabase] Invalid public client key: VITE_SUPABASE_ANON_KEY contains whitespace or newline. ' +
    'Edit the environment variable and ensure it is a single-line key with no surrounding quotes.'
  );
}

// Supabase supports both the legacy JWT anon key (eyJ...) and the modern
// publishable key (sb_publishable_...). Accept either public-client format so
// rotating to the new key format does not break the web app or APK bootstrap.
const isLegacyAnonKey = supabaseAnonKey.startsWith('eyJ');
const isPublishableKey = supabaseAnonKey.startsWith('sb_publishable_');
if (!isLegacyAnonKey && !isPublishableKey) {
  throw new Error(
    '[Supabase] Invalid public client key in VITE_SUPABASE_ANON_KEY. ' +
    'Expected a legacy anon JWT (eyJ...) or a modern publishable key (sb_publishable_...).'
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

// ── Capacitor Preferences storage adapter ────────────────────────────────────
//
// When running as an Android APK, localStorage in the WebView can be cleared by
// the OS under memory pressure.  @capacitor/preferences writes to native Android
// SharedPreferences (encrypted at rest), which is far more reliable.
//
// Detection: window.Capacitor is injected by the Capacitor bridge only inside
// the APK; it is never present in a regular browser or Netlify deployment.
//
// The adapter is loaded lazily (dynamic import) so the Capacitor plugin is
// never bundled into the web-only chunk.

function buildCapacitorStorageAdapter(): SupportedStorage {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const { value } = await Preferences.get({ key });
        return value;
      } catch (err) {
        console.warn('[supabase] Capacitor Preferences.get failed, falling back to localStorage', err);
        try { return window.localStorage.getItem(key); } catch (lsErr) {
          console.warn('[supabase] localStorage.getItem fallback also failed', lsErr);
          return null;
        }
      }
    },
    async setItem(key: string, value: string): Promise<void> {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({ key, value });
      } catch (err) {
        console.warn('[supabase] Capacitor Preferences.set failed, falling back to localStorage', err);
        try { window.localStorage.setItem(key, value); } catch (lsErr) {
          console.warn('[supabase] localStorage.setItem fallback also failed', lsErr);
        }
      }
    },
    async removeItem(key: string): Promise<void> {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.remove({ key });
      } catch (err) {
        console.warn('[supabase] Capacitor Preferences.remove failed, falling back to localStorage', err);
        try { window.localStorage.removeItem(key); } catch (lsErr) {
          console.warn('[supabase] localStorage.removeItem fallback also failed', lsErr);
        }
      }
    },
  };
}

// Detect Capacitor runtime (injected by the bridge on Android/iOS only).
const authStorage: SupportedStorage | undefined = (() => {
  if (isCapacitorNative()) return buildCapacitorStorageAdapter();
  if (typeof window !== 'undefined') return window.localStorage;
  return undefined;
})();

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Detect session tokens in the URL so magic-link, OAuth, and
    // password-reset redirects work correctly in the browser.
    detectSessionInUrl: true,
    // In the APK use native SharedPreferences via @capacitor/preferences for
    // reliable session persistence.  In the browser, use localStorage.
    storage: authStorage,
  },
  global: {
    // Use the mobile-safe fetch wrapper defined above.
    fetch: mobileSafeFetch,
  },
});

// Canonical sign-out boundary. Every current logout surface already converges
// on supabase.auth.signOut(), so protect native push privacy here rather than
// duplicating cleanup logic across Header, Buyer/Seller/Admin shells and mobile
// profile/settings. `scope: others` does not end the current device session and
// therefore must not unregister this device's push token.
const baseSignOut = supabaseClient.auth.signOut.bind(supabaseClient.auth);
supabaseClient.auth.signOut = async (options) => {
  if (options?.scope !== 'others') {
    const { data: { session } } = await supabaseClient.auth.getSession();
    await protectCurrentDevicePushBeforeSignOut(session?.access_token);
  }
  return baseSignOut(options);
};

export const supabase = supabaseClient;
