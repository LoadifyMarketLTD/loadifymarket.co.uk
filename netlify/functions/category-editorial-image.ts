import type { Handler } from '@netlify/functions';

const ID_PATTERN = /^[A-Za-z0-9_-]{6,80}$/;
const IMAGE_ID_PATTERN = /^photo-[A-Za-z0-9_-]{10,80}$/;

const cacheHeaders = {
  'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400',
  'CDN-Cache-Control': 'public, max-age=2592000, stale-while-revalidate=86400',
  'Content-Type': 'image/jpeg',
  'X-Content-Type-Options': 'nosniff',
};

/**
 * Same-origin proxy for the temporary editorial subcategory library.
 *
 * SECURITY BOUNDARY:
 * - callers cannot supply a URL or hostname;
 * - only a constrained Unsplash identifier is accepted;
 * - the upstream URL is constructed server-side from a fixed allowlist;
 * - redirects must terminate on images.unsplash.com.
 *
 * This prevents browser hotlink/redirect failures while the 96-image premium
 * local library is being replaced. It is not a generic image proxy.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const kind = event.queryStringParameters?.kind;
  const id = event.queryStringParameters?.id ?? '';

  if (kind !== 'image' && kind !== 'download') {
    return { statusCode: 400, body: 'Invalid image kind' };
  }

  if (kind === 'image' ? !IMAGE_ID_PATTERN.test(id) : !ID_PATTERN.test(id)) {
    return { statusCode: 400, body: 'Invalid image id' };
  }

  const upstream =
    kind === 'image'
      ? `https://images.unsplash.com/${id}?auto=format&fit=crop&fm=jpg&q=82&w=1600&h=1200`
      : `https://unsplash.com/photos/${id}/download?force=true&w=1600`;

  try {
    const response = await fetch(upstream, {
      redirect: 'follow',
      headers: { 'User-Agent': 'LoadifyMarket/1.0 editorial-image-proxy' },
    });

    if (!response.ok) {
      return { statusCode: 502, body: 'Editorial image unavailable' };
    }

    const resolved = new URL(response.url);
    if (resolved.protocol !== 'https:' || resolved.hostname !== 'images.unsplash.com') {
      return { statusCode: 502, body: 'Unexpected editorial image origin' };
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) {
      return { statusCode: 502, body: 'Invalid editorial image payload' };
    }

    return {
      statusCode: 200,
      headers: cacheHeaders,
      isBase64Encoded: true,
      body: bytes.toString('base64'),
    };
  } catch (error) {
    console.error('[category-editorial-image] upstream fetch failed', error);
    return { statusCode: 502, body: 'Editorial image unavailable' };
  }
};
