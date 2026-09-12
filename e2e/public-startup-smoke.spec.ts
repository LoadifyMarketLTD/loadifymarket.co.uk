import { expect, test } from '@playwright/test';

test('public app boots without falling into the global error boundary', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toHaveCount(0);

  await page.waitForTimeout(1500);
  expect(pageErrors).toEqual([]);
});

test('public app survives a clean reload without stale-chunk failure', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toHaveCount(0);
});