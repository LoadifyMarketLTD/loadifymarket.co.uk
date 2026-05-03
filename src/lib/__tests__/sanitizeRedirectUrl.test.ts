import { describe, it, expect } from 'vitest';
import { sanitizeRedirectUrl } from '../sanitizeRedirectUrl';

// jsdom sets window.location.origin to "http://localhost" by default.

describe('sanitizeRedirectUrl — valid same-origin paths', () => {
  it('accepts a simple relative path', () => {
    expect(sanitizeRedirectUrl('/dashboard')).toBe('/dashboard');
  });

  it('accepts a path with query string', () => {
    expect(sanitizeRedirectUrl('/catalog?q=shoes')).toBe('/catalog?q=shoes');
  });

  it('accepts a path with hash fragment', () => {
    expect(sanitizeRedirectUrl('/product/123#details')).toBe('/product/123#details');
  });

  it('accepts a deeply nested path', () => {
    expect(sanitizeRedirectUrl('/buyer/orders/456')).toBe('/buyer/orders/456');
  });
});

describe('sanitizeRedirectUrl — absolute external URLs (must be rejected)', () => {
  it('rejects https:// absolute URL', () => {
    expect(sanitizeRedirectUrl('https://evil.com')).toBeNull();
  });

  it('rejects http:// absolute URL', () => {
    expect(sanitizeRedirectUrl('http://evil.com/phish')).toBeNull();
  });

  it('rejects protocol-relative URL //evil.com', () => {
    expect(sanitizeRedirectUrl('//evil.com')).toBeNull();
  });

  it('rejects backslash protocol-relative URL /\\evil.com', () => {
    expect(sanitizeRedirectUrl('/\\evil.com')).toBeNull();
  });

  it('rejects javascript: protocol', () => {
    expect(sanitizeRedirectUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects data: URL', () => {
    expect(sanitizeRedirectUrl('data:text/html,<h1>hi</h1>')).toBeNull();
  });

  it('rejects a bare domain with no leading slash', () => {
    expect(sanitizeRedirectUrl('evil.com')).toBeNull();
  });
});

describe('sanitizeRedirectUrl — falsy / invalid inputs', () => {
  it('returns null for null', () => {
    expect(sanitizeRedirectUrl(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(sanitizeRedirectUrl(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(sanitizeRedirectUrl('')).toBeNull();
  });
});
