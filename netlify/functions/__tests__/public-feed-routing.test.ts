import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { handler } from '../product-feed';

describe('public XML route precedence', () => {
  const redirects = readFileSync('public/_redirects', 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  it('routes the product feed to its function before the SPA fallback', () => {
    const feedRule = redirects.findIndex((line) => line.startsWith('/product-feed.xml'));
    const spaFallback = redirects.findIndex((line) => line.startsWith('/*'));

    expect(feedRule).toBeGreaterThanOrEqual(0);
    expect(feedRule).toBeLessThan(spaFallback);
    expect(redirects[feedRule]).toContain('/.netlify/functions/product-feed');
    expect(redirects[feedRule]).toMatch(/200!$/);
  });

  it('keeps the dynamic sitemap and API proxy ahead of the SPA fallback', () => {
    const spaFallback = redirects.findIndex((line) => line.startsWith('/*'));
    expect(redirects.findIndex((line) => line.startsWith('/sitemap.xml'))).toBeLessThan(spaFallback);
    expect(redirects.findIndex((line) => line.startsWith('/api/*'))).toBeLessThan(spaFallback);
  });

  it('fails visibly instead of publishing a successful empty feed without Supabase configuration', async () => {
    const previousUrl = process.env.VITE_SUPABASE_URL;
    const previousKey = process.env.VITE_SUPABASE_ANON_KEY;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;

    try {
      const response = await handler({
        httpMethod: 'GET',
        queryStringParameters: null,
      } as never, {} as never);

      expect(response.statusCode).toBe(503);
      expect(response.headers?.['Content-Type']).toBe('text/plain; charset=utf-8');
      expect(response.headers?.['Cache-Control']).toBe('no-store');
      expect(response.body).toBe('Product feed temporarily unavailable');
    } finally {
      if (previousUrl === undefined) delete process.env.VITE_SUPABASE_URL;
      else process.env.VITE_SUPABASE_URL = previousUrl;
      if (previousKey === undefined) delete process.env.VITE_SUPABASE_ANON_KEY;
      else process.env.VITE_SUPABASE_ANON_KEY = previousKey;
    }
  });

  it('selects the unambiguous primary category relationship', () => {
    const source = readFileSync('netlify/functions/product-feed.ts', 'utf8');
    expect(source).toContain('category:categories!categoryId ( slug )');
    expect(source).not.toContain('categories ( slug )');
  });
});
