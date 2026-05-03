/**
 * Returns `url` if it is a safe same-origin relative path, or `null` otherwise.
 *
 * Rules applied (defence-in-depth):
 *  1. Must be a non-empty string.
 *  2. Must start with "/" (rejects absolute URLs such as "https://evil.com").
 *  3. Must NOT start with "//" (rejects protocol-relative URLs "//evil.com").
 *  4. Must NOT start with "/\" (rejects the browser normalisation trick "/\evil.com").
 *  5. When resolved against the current origin via the URL constructor, the
 *     resulting origin must match window.location.origin (catches any remaining
 *     edge cases the string checks might miss in future browser versions).
 *
 * Used by Login.tsx and any future code that reads a redirect target from an
 * untrusted source (query params, state, etc.).
 */
export function sanitizeRedirectUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;

  // Reject anything that is clearly external before touching the URL constructor.
  if (!url.startsWith("/")) return null;
  if (url.startsWith("//") || url.startsWith("/\\")) return null;

  // Final origin check via URL constructor — catches any other normalisation
  // tricks that string prefix checks alone cannot cover.
  try {
    const resolved = new URL(url, window.location.origin);
    if (resolved.origin !== window.location.origin) return null;
  } catch {
    // Malformed URL — reject it.
    return null;
  }

  return url;
}
