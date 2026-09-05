import { describe, expect, it } from 'vitest';
import { ensureJsonContentType } from '../jsonContentTypeCompat';

describe('ensureJsonContentType', () => {
  it('forces application/json over the default text/plain Response content type', async () => {
    const response = ensureJsonContentType(
      new Response(JSON.stringify({ url: 'https://checkout.stripe.com/example' }), { status: 200 }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    await expect(response.json()).resolves.toEqual({
      url: 'https://checkout.stripe.com/example',
    });
  });

  it('forces the checkout JSON contract even when an upstream text content type is present', () => {
    const response = ensureJsonContentType(
      new Response(JSON.stringify({ error: 'example' }), {
        status: 400,
        headers: { 'content-type': 'text/plain;charset=UTF-8' },
      }),
    );

    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
  });
});
