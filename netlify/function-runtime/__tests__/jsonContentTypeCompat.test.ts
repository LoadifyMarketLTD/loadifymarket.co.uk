import { describe, expect, it } from 'vitest';
import { ensureJsonContentType } from '../jsonContentTypeCompat';

describe('ensureJsonContentType', () => {
  it('adds application/json when a checkout response has no content type', async () => {
    const response = ensureJsonContentType(
      new Response(JSON.stringify({ url: 'https://checkout.stripe.com/example' }), { status: 200 }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    await expect(response.json()).resolves.toEqual({
      url: 'https://checkout.stripe.com/example',
    });
  });

  it('preserves an explicit content type', () => {
    const response = ensureJsonContentType(
      new Response('ok', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      }),
    );

    expect(response.headers.get('content-type')).toBe('text/plain');
  });
});
