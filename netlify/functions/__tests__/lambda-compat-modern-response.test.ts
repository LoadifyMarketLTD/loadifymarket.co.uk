import type { Handler } from '@netlify/functions';
import { describe, expect, it } from 'vitest';
import { withLambda } from '../../function-runtime/lambdaCompat';

describe('modern Lambda compatibility adapter', () => {
  it('omits the body for 204 responses', async () => {
    const handler: Handler = async () => ({
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': 'https://loadifymarket.co.uk',
      },
      body: '',
    });

    const response = await withLambda(handler)(
      new Request('https://loadifymarket.co.uk/.netlify/functions/smoke', {
        method: 'OPTIONS',
      }),
      { requestId: 'req-204' },
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://loadifymarket.co.uk',
    );
  });

  it('preserves normal JSON response bodies', async () => {
    const handler: Handler = async () => ({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    });

    const response = await withLambda(handler)(
      new Request('https://loadifymarket.co.uk/.netlify/functions/smoke'),
      { requestId: 'req-200' },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
