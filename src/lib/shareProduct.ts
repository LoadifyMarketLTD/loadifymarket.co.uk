/**
 * shareProduct — cross-platform product share helper.
 *
 * On native platforms (Capacitor APK/IPA): uses @capacitor/share which opens
 * the OS native share sheet.  Facebook, WhatsApp, Messenger etc. appear
 * automatically as available targets — no custom intent URL needed.
 *
 * On web with navigator.share (Chrome Android, Safari iOS): uses the
 * Web Share API.
 *
 * Fallback: copies the URL to the clipboard.
 */

import { Capacitor } from '@capacitor/core';

export interface ShareProductOptions {
  id: string;
  title: string;
  price?: number;
}

export async function shareProduct(product: ShareProductOptions): Promise<void> {
  const url = `https://loadifymarket.co.uk/product/${product.id}`;
  const title = product.title;
  const text = product.price != null
    ? `${title} — £${product.price.toLocaleString('en-GB')} on Loadify Market`
    : `${title} on Loadify Market`;

  if (Capacitor.isNativePlatform()) {
    // Dynamic import so the Capacitor plugin is not bundled into the web build
    // (though tree-shaking would handle it anyway).
    const { Share } = await import('@capacitor/share');
    await Share.share({ title, text, url, dialogTitle: 'Share product' });
    return;
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    await navigator.share({ title, text, url });
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
  }
}

/** Returns true when the share sheet can be triggered (native or Web Share API). */
export function canShare(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}
