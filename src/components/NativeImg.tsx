/**
 * NativeImg — <img> wrapper that works correctly inside the Capacitor APK.
 *
 * Root cause
 * ----------
 * With CapacitorHttp.enabled=true, Capacitor's native bridge registers an
 * Android WebView shouldInterceptRequest callback that intercepts EVERY
 * network request fired by the WebView — including <img> tag loads, CSS
 * url() references, etc.  In some Capacitor v8 builds the binary response
 * relay (native OkHttp response bytes → WebView) is unreliable: the image
 * bytes are delivered with an incorrect content-type or get mangled in
 * transit, so the WebView renders a blank/black rectangle without triggering
 * the HTMLImageElement onError event (the element considers the load a
 * success because it received HTTP 200).
 *
 * Fix
 * ---
 * On native: call fetch() explicitly for each image URL.  fetch() in
 * Capacitor APK goes through the CapacitorHttp native plugin which correctly
 * returns a binary Blob via OkHttp.  We then call URL.createObjectURL(blob)
 * to produce a blob: URL that the WebView can render directly from the
 * in-process Blob store, completely bypassing shouldInterceptRequest.
 *
 * On web: behaves as a plain <img> — no fetch overhead, no blob URLs, no
 * extra memory usage.
 *
 * Usage
 * -----
 *   <NativeImg
 *     src={imageUrl}
 *     alt="product image"
 *     style={{ width: '100%', height: '100%', objectFit: 'cover' }}
 *     fallback={<ProductImagePlaceholder />}
 *   />
 *
 * While the image is loading (native only) or when it fails, `fallback`
 * is rendered in its place.
 */

import { useState, useEffect, useRef } from 'react';
import { isCapacitorNative } from '@/lib/capacitorUtils';

// Evaluated once at module load — avoids a per-render check.
const IS_NATIVE = isCapacitorNative();

export interface NativeImgProps {
  /** Image URL.  Pass undefined/empty to show the fallback immediately. */
  src: string | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  /** 'lazy' (default) or 'eager' for above-the-fold images. */
  loading?: 'lazy' | 'eager';
  /** Fetch priority hint for above-the-fold images (web only; ignored on native). */
  fetchPriority?: 'high' | 'low' | 'auto';
  /**
   * Image decoding hint.  Defaults to 'async' so off-screen image decoding
   * does not block the main thread.  Use 'auto' for above-the-fold / LCP
   * images to let the browser decide the optimal strategy.
   */
  decoding?: 'async' | 'sync' | 'auto';
  /** Rendered when src is empty, still loading (native), or the load fails. */
  fallback?: React.ReactNode;
}

export default function NativeImg({
  src,
  alt,
  className,
  style,
  loading: loadingAttr = 'lazy',
  fetchPriority,
  decoding = 'async',
  fallback = null,
}: NativeImgProps) {
  /**
   * resolvedSrc states:
   *   undefined  — still loading (native) / no src provided initially
   *   ''         — failed (fetch error or img onError)
   *   'blob:...' — successfully fetched on native
   *   'https://' — used directly on web
   */
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(
    IS_NATIVE ? undefined : (src ?? ''),
  );
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!IS_NATIVE) {
      // Web: mirror the src prop, deferred to avoid synchronous setState in effect.
      const v = src ?? '';
      queueMicrotask(() => setResolvedSrc(v));
      return;
    }

    let cancelled = false;

    if (!src) {
      queueMicrotask(() => { if (!cancelled) setResolvedSrc(''); });
      return () => { cancelled = true; };
    }

    // Reset to loading state before the new fetch.
    queueMicrotask(() => { if (!cancelled) setResolvedSrc(undefined); });

    // Revoke the previous blob URL to free memory before creating a new one.
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    fetch(src)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then(blob => {
        if (cancelled) return;
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;
        setResolvedSrc(blobUrl);
      })
      .catch(() => {
        if (!cancelled) setResolvedSrc(''); // triggers fallback
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  // Revoke the blob URL when the component unmounts.
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  // No src, still loading (native), or fetch failed → show fallback.
  if (!resolvedSrc) return <>{fallback}</>;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={style}
      loading={loadingAttr}
      fetchPriority={fetchPriority}
      decoding={decoding}
      onError={() => setResolvedSrc('')}
    />
  );
}
