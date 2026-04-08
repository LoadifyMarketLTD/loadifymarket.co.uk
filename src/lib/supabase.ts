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

// Detect Capacitor native environment (window.Capacitor is injected by the
// native runtime before any JS runs in the WebView).
const isNative =
  typeof window !== 'undefined' && 'Capacitor' in window;

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
});

