/**
 * Tests for imageOptimization.ts
 *
 * Netlify Image CDN is disabled — optimizeImage always returns the source URL
 * unchanged (or '' for null/undefined).  These tests validate that behaviour
 * in both development and production modes.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('optimizeImage – passthrough (CDN disabled)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns empty string for null src', async () => {
    const { optimizeImage } = await import('../imageOptimization');
    expect(optimizeImage(null)).toBe('');
  });

  it('returns empty string for undefined src', async () => {
    const { optimizeImage } = await import('../imageOptimization');
    expect(optimizeImage(undefined)).toBe('');
  });

  it('returns src unchanged regardless of opts', async () => {
    const { optimizeImage } = await import('../imageOptimization');
    const src = 'https://example.com/image.jpg';
    expect(optimizeImage(src, { width: 400, format: 'webp' })).toBe(src);
  });

  it('returns data URIs unchanged', async () => {
    const { optimizeImage } = await import('../imageOptimization');
    const src = 'data:image/png;base64,abc123';
    expect(optimizeImage(src)).toBe(src);
  });

  it('returns blob URLs unchanged', async () => {
    const { optimizeImage } = await import('../imageOptimization');
    const src = 'blob:http://localhost/uuid';
    expect(optimizeImage(src)).toBe(src);
  });

  it('returns Supabase storage URLs unchanged', async () => {
    const { optimizeImage } = await import('../imageOptimization');
    const src = 'https://fwdfpmfvgygvqciecesx.supabase.co/storage/v1/object/public/product-images/img.jpg';
    expect(optimizeImage(src)).toBe(src);
  });

  it('never produces a /.netlify/images URL', async () => {
    const { optimizeImage } = await import('../imageOptimization');
    const src = 'https://fwdfpmfvgygvqciecesx.supabase.co/storage/v1/object/public/img.jpg';
    expect(optimizeImage(src, { width: 300, format: 'webp' })).not.toContain('/.netlify/images');
  });

  it('returns raw URL in production mode too', async () => {
    vi.stubEnv('PROD', 'true' as unknown as boolean);
    vi.resetModules();
    const { optimizeImage } = await import('../imageOptimization');
    const src = 'https://cdn.example.com/photo.jpg';
    expect(optimizeImage(src, { width: 400, format: 'webp' })).toBe(src);
  });
});

describe('convenience presets', () => {
  it('productThumbnail returns a non-empty string for a valid URL in dev', async () => {
    const { productThumbnail } = await import('../imageOptimization');
    const result = productThumbnail('https://example.com/img.jpg');
    expect(result).toBeTruthy();
  });

  it('productHero returns src unchanged in dev', async () => {
    const { productHero } = await import('../imageOptimization');
    const src = 'https://example.com/hero.jpg';
    expect(productHero(src)).toBe(src);
  });

  it('sellerAvatar returns empty string for null input', async () => {
    const { sellerAvatar } = await import('../imageOptimization');
    expect(sellerAvatar(null)).toBe('');
  });
});
