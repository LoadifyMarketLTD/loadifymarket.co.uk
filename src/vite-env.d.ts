/// <reference types="vite/client" />

// Build-time constants injected by the CI workflow via VITE_BUILD_* env vars.
// Values are the empty string when building locally without them set.
interface ImportMetaEnv {
  readonly VITE_BUILD_SHA: string;
  readonly VITE_BUILD_NUMBER: string;
  readonly VITE_BUILD_TIME: string;
  // Existing runtime vars (documented for completeness — Vite types these via
  // its own mechanism, but listing them here keeps the definition self-contained).
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  // Public Google OAuth client identifier used by the web-only GIS signup flow.
  // This is not a client secret and is safe to expose in the browser bundle.
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
