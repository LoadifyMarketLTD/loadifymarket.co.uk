/**
 * Netlify Image CDN utility — Loadify Market
 *
 * Wraps Netlify's built-in image transformation service
 * (https://docs.netlify.com/image-cdn/overview/) to produce optimised,
 * responsive image URLs without a separate CDN subscription.
 *
 * Usage:
 *   import { optimizeImage } from '@/lib/imageOptimization';
 *
 *   <img src={optimizeImage(rawUrl, { width: 400, format: 'webp' })} />
 *
 * The helper returns the original URL unchanged when:
 *  - Running in development (Netlify Image CDN is not available locally).
 *  - The source URL is a data URI, blob URL, or already a Netlify CDN URL.
 *  - The `rawUrl` is null / undefined.
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

const IS_PROD = import.meta.env.PROD;
const CDN_BASE = '/.netlify/images';

/**
 * Returns an optimised Netlify Image CDN URL for `src`, or `src` unchanged
 * when transformation is unavailable or not applicable.
 */
export function optimizeImage(src: string | null | undefined, opts: ImageOptions = {}): string {
  if (!src) return '';

  // Skip transformation for data URIs, blob URLs, and existing CDN URLs.
  if (
    src.startsWith('data:') ||
    src.startsWith('blob:') ||
    src.includes('/.netlify/images')
  ) {
    return src;
  }

  // Only apply transformation in production (Netlify environment).
  if (!IS_PROD) return src;

  const params = new URLSearchParams({ url: src });

  if (opts.width != null) params.set('w', String(opts.width));
  if (opts.height != null) params.set('h', String(opts.height));
  if (opts.format && opts.format !== 'auto') params.set('fm', opts.format);
  if (opts.fit) params.set('fit', opts.fit);
  if (opts.quality != null) params.set('q', String(opts.quality));

  return `${CDN_BASE}?${params.toString()}`;
}

/**
 * Convenience preset: thumbnail suitable for product listing cards.
 * 300 × 300 px, WebP, quality 80.
 */
export function productThumbnail(src: string | null | undefined): string {
  return optimizeImage(src, { width: 300, height: 300, format: 'webp', fit: 'cover', quality: 80 });
}

/**
 * Convenience preset: hero / product detail image.
 * 800 px wide, WebP, quality 85.
 */
export function productHero(src: string | null | undefined): string {
  return optimizeImage(src, { width: 800, format: 'webp', quality: 85 });
}

/**
 * Convenience preset: seller / store avatar.
 * 64 × 64 px, WebP, quality 80.
 */
export function sellerAvatar(src: string | null | undefined): string {
  return optimizeImage(src, { width: 64, height: 64, format: 'webp', fit: 'cover', quality: 80 });
}
