import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.uk.loadifymarket.app',
  appName: 'Loadify Market',
  webDir: 'dist',
  server: {
    // Use HTTPS scheme for proper cookie/auth handling in the WebView.
    androidScheme: 'https',
    // allowNavigation lists external domains that the WebView is permitted to
    // navigate to directly.  This is NOT required for @capacitor/browser
    // (Chrome Custom Tabs) — those open outside the WebView entirely.
    // The Supabase domain is listed so that OAuth redirects back from the
    // Supabase Auth server work correctly when processed by the WebView before
    // being handed off to the Android App Link / appUrlOpen listener.
    allowNavigation: ['*.supabase.co', '*.google.com', '*.accounts.google.com'],
    // Clear text for development only — keep false in production.
    cleartext: false,
  },
  android: {
    // Build configuration — populated at release-signing time.
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    },
  },
  plugins: {
    // Route all window.fetch and XMLHttpRequest calls through the native Android
    // HTTP client instead of the WebView network stack.  This resolves the
    // "Network error — please check your connection" failure seen in the APK
    // because it bypasses WebView-specific limitations such as CORS restrictions
    // from the https://localhost origin, keepalive support gaps, and other
    // Chromium WebView quirks that do not affect desktop browsers.
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#020617',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#020617',
    },
  },
};

export default config;
