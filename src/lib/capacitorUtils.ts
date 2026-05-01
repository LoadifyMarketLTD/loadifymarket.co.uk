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
