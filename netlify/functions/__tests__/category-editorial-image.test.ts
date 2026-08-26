import { afterEach, describe, expect, it, vi } from 'vitest';
import { handler } from '../category-editorial-image';

type HandlerArgs = Parameters<typeof handler>;
type HandlerEvent = HandlerArgs[0];
type HandlerContext = HandlerArgs[1];
type HandlerCallback = HandlerArgs[2];

const context = {} as HandlerContext;
const callback: HandlerCallback = () => undefined;

afterEach(() => {
  vi.restoreAllMocks();
});

const event = (query: Record<string, string> = {}, method = 'GET') =>
  ({
    httpMethod: method,
    queryStringParameters: query,
    headers: {},
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    body: null,
    isBase64Encoded: false,
    path: '/.netlify/functions/category-editorial-image',
    rawQuery: '',
    rawUrl: 'https://loadifymarket.co.uk/.netlify/functions/category-editorial-image',
  }) as HandlerEvent;

describe('category-editorial-image', () => {
  it('rejects non-GET requests', async () => {
    const result = await handler(event({}, 'POST'), context, callback);
    expect(result).toMatchObject({ statusCode: 405 });
  });

  it('rejects arbitrary URL-like identifiers before fetching', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await handler(
      event({ kind: 'download', id: 'https://evil.example/image.jpg' }),
      context,
      callback,
    );
    expect(result).toMatchObject({ statusCode: 400 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns a cached base64 jpeg when the final upstream is images.unsplash.com', async () => {
    const upstream = {
      ok: true,
      url: 'https://images.unsplash.com/photo-test',
      arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
    } as Response;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(upstream);

    const result = await handler(
      event({ kind: 'image', id: 'photo-1637414165749-9b3cd88b8271' }),
      context,
      callback,
    );

    expect(result).toMatchObject({
      statusCode: 200,
      isBase64Encoded: true,
      body: Buffer.from([1, 2, 3, 4]).toString('base64'),
    });
    expect(result && 'headers' in result ? result.headers?.['Content-Type'] : undefined).toBe('image/jpeg');
    expect(result && 'headers' in result ? result.headers?.['Cache-Control'] : undefined).toContain('max-age=604800');
  });

  it('rejects a successful response that resolves outside the fixed Unsplash image host', async () => {
    const upstream = {
      ok: true,
      url: 'https://cdn.evil.example/image.jpg',
      arrayBuffer: async () => new Uint8Array([1]).buffer,
    } as Response;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(upstream);

    const result = await handler(
      event({ kind: 'download', id: 'EZKoA4cyUyo' }),
      context,
      callback,
    );
    expect(result).toMatchObject({ statusCode: 502 });
  });

  it('rejects oversized image payloads', async () => {
    const upstream = {
      ok: true,
      url: 'https://images.unsplash.com/photo-test',
      arrayBuffer: async () => new Uint8Array(8 * 1024 * 1024 + 1).buffer,
    } as Response;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(upstream);

    const result = await handler(
      event({ kind: 'download', id: 'EZKoA4cyUyo' }),
      context,
      callback,
    );
    expect(result).toMatchObject({ statusCode: 502 });
  });
});
