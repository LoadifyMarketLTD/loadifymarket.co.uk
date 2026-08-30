import { expect, test, type Page } from '@playwright/test';

type Credentials = {
  email?: string;
  password?: string;
};

const buyer: Credentials = {
  email: process.env.E2E_BUYER_EMAIL,
  password: process.env.E2E_BUYER_PASSWORD,
};

const seller: Credentials = {
  email: process.env.E2E_SELLER_EMAIL,
  password: process.env.E2E_SELLER_PASSWORD,
};

const admin: Credentials = {
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
};

function hasCredentials(value: Credentials): value is Required<Credentials> {
  return Boolean(value.email && value.password);
}

async function signIn(page: Page, credentials: Required<Credentials>): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).not.toBe('/login');
}

async function accessTokenFromBrowser(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;

      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as {
          access_token?: unknown;
          currentSession?: { access_token?: unknown };
        };
        if (typeof parsed.access_token === 'string') return parsed.access_token;
        if (typeof parsed.currentSession?.access_token === 'string') return parsed.currentSession.access_token;
      } catch {
        // Ignore unrelated or malformed localStorage entries.
      }
    }

    return null;
  });
}

test('Buyer can reach Buyer orders and Checkout without crossing into Admin', async ({ page, request }) => {
  test.skip(!hasCredentials(buyer), 'E2E Buyer credentials are not configured');

  await signIn(page, buyer);

  await page.goto('/buyer/orders');
  await expect(page).toHaveURL(/\/buyer\/orders(?:[?#].*)?$/);

  await page.goto('/checkout');
  await expect(page).toHaveURL(/\/checkout(?:[?#].*)?$/);

  const token = await accessTokenFromBrowser(page);
  expect(token).toBeTruthy();

  const adminResponse = await request.get('/.netlify/functions/admin-orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(adminResponse.status()).toBe(403);
});

test('Seller can reach canonical fulfillment workspaces', async ({ page }) => {
  test.skip(!hasCredentials(seller), 'E2E Seller credentials are not configured');

  await signIn(page, seller);

  await page.goto('/seller/orders');
  await expect(page).toHaveURL(/\/seller\/orders(?:[?#].*)?$/);

  await page.goto('/seller/shipments');
  await expect(page).toHaveURL(/\/seller\/shipments(?:[?#].*)?$/);
});

test('Seller cannot mutate another seller order when a foreign fixture is configured', async ({ page, request }) => {
  const foreignOrderId = process.env.E2E_FOREIGN_ORDER_ID;
  test.skip(!hasCredentials(seller) || !foreignOrderId, 'Seller credentials and E2E_FOREIGN_ORDER_ID are required');

  await signIn(page, seller);
  const token = await accessTokenFromBrowser(page);
  expect(token).toBeTruthy();

  const response = await request.post('/.netlify/functions/seller-order-status', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      orderId: foreignOrderId,
      status: 'packed',
    },
  });

  expect(response.status()).toBe(403);
});

test('Admin can reach order and payout reconciliation surfaces', async ({ page }) => {
  test.skip(!hasCredentials(admin), 'E2E Admin credentials are not configured');

  await signIn(page, admin);

  await page.goto('/admin/orders');
  await expect(page).toHaveURL(/\/admin\/orders(?:[?#].*)?$/);

  await page.goto('/admin/payouts');
  await expect(page).toHaveURL(/\/admin\/payouts(?:[?#].*)?$/);
});

// Intentionally no live escrow-release mutation here. The canonical release
// function can move Stripe funds, so a mutation test must remain behind an
// explicit Stripe test-mode + seeded-order gate instead of running on every PR.
