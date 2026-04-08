import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.uk.loadifymarket.app',
  appName: 'Loadify Market',
  webDir: 'dist',
  server: {
    // Use HTTPS scheme for proper cookie/auth handling in the WebView.
    androidScheme: 'https',
    // Allow navigation back to the live site for external links.
    // External URLs (Stripe, Supabase auth) open in the system browser via
    // the allowNavigation list below being empty — Capacitor's default
    // behaviour opens non-matching URLs in the external browser.
    allowNavigation: [],
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
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0A0A0A',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0A0A0A',
    },
  },
};

export default config;
