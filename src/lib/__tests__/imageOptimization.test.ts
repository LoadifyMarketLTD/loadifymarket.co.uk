/**
 * Tests for imageOptimization.ts
 *
 * In the test environment import.meta.env.PROD is false, so optimizeImage
 * always returns the source URL unchanged. The tests validate the passthrough
 * behaviour and the CDN URL structure via a manual PROD override.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

// We re-import the module fresh in each group so the PROD flag can be
// mocked at module level via vi.stubEnv.
describe('optimizeImage – development (IS_PROD = false)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns empty string for null src', async () => {
    const { optimizeImage } = await import('../imageOptimization');
    expect(optimizeImage(null)).toBe('');
  });

  it('returns empty string for undefined src', async () => {
    const { optimizeImage } = await import('../imageOptimization');
    expect(optimizeImage(undefined)).toBe('');
  });

  it('returns src unchanged in development', async () => {
    const { optimizeImage } = await import('../imageOptimization');
    const src = 'https://example.com/image.jpg';
    expect(optimizeImage(src, { width: 400 })).toBe(src);
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

  it('returns existing CDN URLs unchanged', async () => {
    const { optimizeImage } = await import('../imageOptimization');
    const src = 'https://example.com/.netlify/images?url=foo';
    expect(optimizeImage(src)).toBe(src);
  });
});

describe('optimizeImage – production (IS_PROD = true)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('generates a CDN URL with width and format params', async () => {
    // Stub the PROD env flag. import.meta.env.PROD is a boolean in Vite,
    // but vi.stubEnv injects it as a string; truthy check still works.
    vi.stubEnv('PROD', 'true' as unknown as boolean);
    // Force module re-evaluation with the stubbed env.
    vi.resetModules();
    const { optimizeImage } = await import('../imageOptimization');
    const url = optimizeImage('https://cdn.example.com/photo.jpg', { width: 400, format: 'webp' });
    expect(url).toContain('/.netlify/images');
    expect(url).toContain('w=400');
    expect(url).toContain('fm=webp');
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
