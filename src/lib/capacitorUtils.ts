/**
 * capacitorUtils — shared helpers for detecting and interacting with the
 * Capacitor native runtime.
 *
 * Keeping detection logic in one place avoids duplication between supabase.ts,
 * Login.tsx, and any future file that needs to branch on web vs. APK.
 */

/**
 * Returns true when the app is running inside a Capacitor native container
 * (Android APK / iOS IPA).  Always false in a regular browser.
 */
export function isCapacitorNative(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!(
      window as Window & {
        Capacitor?: { isNativePlatform?: () => boolean };
      }
    ).Capacitor?.isNativePlatform?.()
  );
}

/**
 * Navigate to an external URL (Stripe Checkout, Stripe Connect onboarding, etc.).
 *
 * On web:            uses `window.location.href` (standard full-page redirect).
 * On Capacitor APK:  opens the URL in Chrome Custom Tabs via @capacitor/browser.
 *
 * Chrome Custom Tabs keep the native app alive in memory and let the user close
 * the tab to return to the APK — a much better experience than `window.location.href`
 * which would destroy the WebView state.  If Android App Links are later configured
 * for the return/cancel URLs, they will automatically bring the user back into the
 * APK instead of remaining in the browser tab.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (isCapacitorNative()) {
    // Dynamic import ensures the Capacitor Browser plugin is never bundled
    // into web-only builds where the native bridge is not available.
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, windowName: '_self' });
  } else {
    window.location.href = url;
  }
}
