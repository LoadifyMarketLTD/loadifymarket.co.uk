import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.uk.loadifymarket.app',
  appName: 'Loadify Market',
  webDir: 'dist',
  server: {
    // Use HTTPS scheme for proper cookie/auth handling in the WebView.
    androidScheme: 'https',
    // allowNavigation lists external domains that the WebView is permitted to
    // navigate to directly. This is NOT required for @capacitor/browser.
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
    // HTTP client instead of the WebView network stack.
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      // Match the current Loadify Market site/app colour identity.
      backgroundColor: '#F8F7F4',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#F8F7F4',
    },
  },
};

export default config;
