import { expect, test } from '@playwright/test';

const protectedRoutes = ['/buyer', '/seller', '/admin'] as const;

for (const route of protectedRoutes) {
  test(`guest cannot enter protected workspace ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });

    await expect.poll(() => new URL(page.url()).pathname).toBe('/login');

    const current = new URL(page.url());
    expect(current.searchParams.get('next')).toBe(route);
  });
}

test('admin orders API rejects an unauthenticated caller', async ({ request }) => {
  const response = await request.get('/.netlify/functions/admin-orders');
  expect(response.status()).toBe(401);
});

test('seller order mutation rejects an unauthenticated caller before order lookup', async ({ request }) => {
  const response = await request.post('/.netlify/functions/seller-order-status', {
    data: {
      orderId: '00000000-0000-0000-0000-000000000000',
      status: 'packed',
    },
  });

  expect(response.status()).toBe(401);
});
