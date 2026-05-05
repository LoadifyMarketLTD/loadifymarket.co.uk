/**
 * Image URL utilities — Loadify Market
 *
 * Product and user images are stored in Supabase Storage and served via the
 * Supabase CDN.  These helpers normalise the URL (returning '' for missing
 * values) and accept optional ImageOptions for future CDN integration.
 *
 * Netlify Image CDN (/.netlify/images?url=…) is intentionally disabled.
 * Although netlify.toml contains the [images] remote_images allowlist,
 * routing every image through the Netlify proxy was causing HTTP 400 errors
 * in production because the allowlist must be deployed before it is active.
 * Supabase Storage already serves images from a global CDN, so the extra
 * proxy hop provides no meaningful benefit and adds a failure point.
 *
 * Usage:
 *   import { productThumbnail } from '@/lib/imageOptimization';
 *   <img src={productThumbnail(rawUrl)} />
 *
 * The helpers return '' for null / undefined input so `src` is always a
 * valid string (React treats src="" as a relative URL, so we guard for that
 * in callers via the `image ? <img …/> : <placeholder/>` pattern).
 */

export interface ImageOptions {
  /** Target width in pixels. */
  width?: number;
  /** Target height in pixels. */
  height?: number;
  /** Output format. Defaults to 'auto' (served as WebP when supported). */
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  /** Crop / fit mode. Defaults to 'cover'. */
  fit?: 'cover' | 'contain' | 'fill';
  /** Image quality (1–100). Defaults to 80. */
  quality?: number;
}

/**
 * Returns `src` unchanged, or '' when `src` is null/undefined/empty.
 *
 * The `opts` parameter is accepted (and ignored) to keep the call-sites
 * compatible with a future CDN integration without requiring changes
 * across the codebase.
 */
export function optimizeImage(src: string | null | undefined, _opts: ImageOptions = {}): string {
  if (!src) return '';
  return src;
}

/**
 * Convenience preset: thumbnail for product listing cards.
 * Opts are retained for call-site compatibility; they are ignored while
 * the Netlify Image CDN is disabled.
 */
export function productThumbnail(src: string | null | undefined): string {
  return optimizeImage(src, { width: 300, height: 300, format: 'webp', fit: 'cover', quality: 80 });
}

/**
 * Convenience preset: hero / product detail image.
 * Opts are retained for call-site compatibility; they are ignored while
 * the Netlify Image CDN is disabled.
 */
export function productHero(src: string | null | undefined): string {
  return optimizeImage(src, { width: 800, format: 'webp', quality: 85 });
}

/**
 * Convenience preset: seller / store avatar.
 * Opts are retained for call-site compatibility; they are ignored while
 * the Netlify Image CDN is disabled.
 */
export function sellerAvatar(src: string | null | undefined): string {
  return optimizeImage(src, { width: 64, height: 64, format: 'webp', fit: 'cover', quality: 80 });
}

/**
 * Builds a `srcset` string for a URL that accepts a `w` query parameter
 * (e.g. Unsplash image CDN).  Returns an empty string when the URL cannot
 * be parsed so callers can safely pass the result as `srcSet={… || undefined}`.
 *
 * @example
 *   buildSrcSet('https://images.unsplash.com/photo-xxx?q=65', [200, 400])
 *   // → 'https://…?q=65&w=200 200w, https://…?q=65&w=400 400w'
 */
export function buildSrcSet(url: string, widths: number[]): string {
  try {
    return widths
      .map((w) => {
        const u = new URL(url);
        u.searchParams.set('w', String(w));
        return `${u.toString()} ${w}w`;
      })
      .join(', ');
  } catch {
    return '';
  }
}
