import { describe, expect, it } from 'vitest';
import { handler } from '../robots';

type HandlerArgs = Parameters<typeof handler>;
type HandlerEvent = HandlerArgs[0];
type HandlerContext = HandlerArgs[1];
type HandlerCallback = HandlerArgs[2];

const context = {} as HandlerContext;
const callback: HandlerCallback = () => undefined;

function event(host: string, method = 'GET') {
  return {
    httpMethod: method,
    headers: { host },
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    queryStringParameters: null,
    body: null,
    isBase64Encoded: false,
    path: '/robots.txt',
    rawQuery: '',
    rawUrl: `https://${host}/robots.txt`,
  } as HandlerEvent;
}

describe('host-aware robots.txt', () => {
  it('keeps the live UK crawler rules and UK sitemap', async () => {
    const result = await handler(event('loadifymarket.co.uk'), context, callback);
    expect(result).toMatchObject({ statusCode: 200 });
    const body = result && 'body' in result ? result.body ?? '' : '';
    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap: https://loadifymarket.co.uk/sitemap.xml');
    expect(body).not.toContain('loadifymarket.ro/sitemap.xml');
  });

  it('blocks Romania crawling while the market remains prelaunch', async () => {
    const result = await handler(event('loadifymarket.ro'), context, callback);
    expect(result).toMatchObject({ statusCode: 200 });
    const body = result && 'body' in result ? result.body ?? '' : '';
    const headers = result && 'headers' in result ? result.headers ?? {} : {};
    expect(body).toBe('User-agent: *\nDisallow: /\n');
    expect(body).not.toContain('Sitemap:');
    expect(headers['X-Robots-Tag']).toBe('noindex, nofollow');
  });

  it('rejects non-GET requests', async () => {
    const result = await handler(event('loadifymarket.co.uk', 'POST'), context, callback);
    expect(result).toMatchObject({ statusCode: 405 });
  });
});
