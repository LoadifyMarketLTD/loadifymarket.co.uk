import type { Handler } from '@netlify/functions';
import { MARKET_CONFIG } from '../../src/lib/marketConfig';

type RobotsMarket = 'GB' | 'RO';

function marketFromEvent(event: Parameters<Handler>[0]): RobotsMarket {
  const forwarded = event.headers['x-forwarded-host'] ?? event.headers.host ?? '';
  const host = forwarded.split(',')[0]?.trim().toLowerCase().replace(/:\d+$/, '') ?? '';
  return host === 'loadifymarket.ro' || host.endsWith('.loadifymarket.ro') ? 'RO' : 'GB';
}

const UK_RULES = [
  'User-agent: *',
  'Allow: /',
  '',
  'Disallow: /pp/',
  'Disallow: /admin',
  'Disallow: /buyer',
  'Disallow: /inbox',
  'Disallow: /orders',
  'Disallow: /profile',
  'Disallow: /welcome',
  'Disallow: /onboarding',
  'Disallow: /seller',
  'Allow: /seller/',
  'Disallow: /seller/products',
  'Disallow: /seller/setup',
  'Disallow: /seller/analytics',
  'Disallow: /seller/payouts',
  'Disallow: /seller/profile',
  'Disallow: /seller/orders',
  'Disallow: /seller/shipments',
  'Disallow: /seller/returns',
  'Disallow: /seller/rfq',
  'Disallow: /seller/reviews',
  'Disallow: /seller/settings',
  'Disallow: /seller/notifications',
  'Disallow: /seller/messages',
  'Disallow: /seller/promote',
  'Disallow: /seller/mobile-payments',
  'Disallow: /checkout',
  'Disallow: /cart',
  'Disallow: /order-success',
  'Disallow: /login',
  'Disallow: /register',
  'Disallow: /signup',
  'Disallow: /forgot-password',
  'Disallow: /reset-password',
  'Disallow: /auth/',
  'Disallow: /trade-account',
  'Disallow: /sell',
  'Disallow: /tracking/',
  'Disallow: /dashboard',
  'Disallow: /seller-register',
  'Disallow: /seller-dashboard',
  'Disallow: /admin-dashboard',
  '',
  'Sitemap: https://loadifymarket.co.uk/sitemap.xml',
];

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const market = marketFromEvent(event);
  if (market === 'RO' && MARKET_CONFIG.RO.status !== 'live') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        'X-Robots-Tag': 'noindex, nofollow',
      },
      body: ['User-agent: *', 'Disallow: /'].join('\n') + '\n',
    };
  }

  const body = market === 'RO'
    ? ['User-agent: *', 'Allow: /', '', 'Sitemap: https://loadifymarket.ro/sitemap.xml'].join('\n')
    : UK_RULES.join('\n');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
    },
    body: body + '\n',
  };
};
