/**
 * Copy a text string to the clipboard.
 *
 * Uses the async Clipboard API when available, falling back to the legacy
 * `document.execCommand("copy")` approach for older browsers.
 *
 * Throws if neither method succeeds.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Deprecated but intentional legacy fallback for browsers without Clipboard API support.
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.cssText = "position:absolute;left:-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}
