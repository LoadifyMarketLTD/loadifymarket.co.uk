import type { Handler } from '@netlify/functions';

const ALLOWED_HOSTS = new Set(['images.unsplash.com', 'unsplash.com']);
const MAX_BYTES = 12 * 1024 * 1024;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const raw = event.queryStringParameters?.url;
  if (!raw) {
    return { statusCode: 400, body: 'Missing image URL' };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { statusCode: 400, body: 'Invalid image URL' };
  }

  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    return { statusCode: 403, body: 'Image origin not allowed' };
  }

  try {
    const response = await fetch(url.toString(), {
      redirect: 'follow',
      headers: {
        'User-Agent': 'LoadifyMarketVisualProxy/1.0',
        Accept: 'image/avif,image/webp,image/jpeg,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return { statusCode: 502, body: `Upstream image failed (${response.status})` };
    }

    const finalUrl = new URL(response.url);
    if (finalUrl.protocol !== 'https:' || !ALLOWED_HOSTS.has(finalUrl.hostname)) {
      return { statusCode: 502, body: 'Unexpected image redirect origin' };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return { statusCode: 502, body: 'Upstream did not return an image' };
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
      return { statusCode: 502, body: 'Invalid upstream image size' };
    }

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
      body: Buffer.from(bytes).toString('base64'),
    };
  } catch (error) {
    console.error('visual-image-proxy:', error);
    return { statusCode: 502, body: 'Image proxy unavailable' };
  }
};
