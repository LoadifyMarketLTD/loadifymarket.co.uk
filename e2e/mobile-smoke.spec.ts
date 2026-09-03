import { expect, test } from '@playwright/test';

const PUBLIC_ROUTES = [
  '/',
  '/marketplace',
  '/login',
  '/register?type=buyer',
  '/cart',
];

test.describe('mobile public smoke', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} renders without page-level horizontal overflow`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status() ?? 200).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();

      await page.waitForLoadState('networkidle').catch(() => undefined);
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
    });
  }
});

test.describe('mobile auth gates', () => {
  for (const protectedRoute of ['/buyer', '/seller', '/admin']) {
    test(`${protectedRoute} does not expose a protected workspace to a guest`, async ({ page }) => {
      await page.goto(protectedRoute, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/login(?:[?#].*)?$/);
    });
  }
});
