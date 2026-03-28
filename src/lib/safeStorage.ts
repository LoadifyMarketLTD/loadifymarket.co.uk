/**
 * Safe browser storage utilities.
 *
 * Mobile browsers in private/incognito mode (and some browsers when storage is
 * blocked by the user) throw a SecurityError when any localStorage property is
 * accessed.  Every read or write in this module is therefore wrapped in
 * try/catch so that a storage outage never crashes the app.
 */

/** Drop-in wrapper for localStorage that silently degrades on access errors. */
export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silently ignore quota-exceeded or access-denied errors.
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently ignore.
    }
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // Silently ignore.
    }
  },
};
