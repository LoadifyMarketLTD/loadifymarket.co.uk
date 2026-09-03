import { expect, test, type Page } from '@playwright/test';

type Credentials = {
  email?: string;
  password?: string;
};

const strictReleaseGate = process.env.E2E_RELEASE_GATE === '1';

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

function requireCredentials(
  value: Credentials,
  label: 'Buyer' | 'Seller' | 'Admin',
): value is Required<Credentials> {
  if (hasCredentials(value)) return true;

  if (strictReleaseGate) {
    throw new Error(`Credentialed E2E release gate requires ${label} credentials`);
  }

  test.skip(true, `E2E ${label} credentials are not configured`);
  return false;
}

function requireForeignOrderId(): string | null {
  const value = process.env.E2E_FOREIGN_ORDER_ID?.trim();
  if (value) return value;

  if (strictReleaseGate) {
    throw new Error('Credentialed E2E release gate requires E2E_FOREIGN_ORDER_ID');
  }

  test.skip(true, 'E2E_FOREIGN_ORDER_ID is required');
  return null;
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
  if (!requireCredentials(buyer, 'Buyer')) return;

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
  if (!requireCredentials(seller, 'Seller')) return;

  await signIn(page, seller);

  await page.goto('/seller/orders');
  await expect(page).toHaveURL(/\/seller\/orders(?:[?#].*)?$/);

  await page.goto('/seller/shipments');
  await expect(page).toHaveURL(/\/seller\/shipments(?:[?#].*)?$/);
});

test('Seller cannot mutate another seller order', async ({ page, request }) => {
  if (!requireCredentials(seller, 'Seller')) return;
  const foreignOrderId = requireForeignOrderId();
  if (!foreignOrderId) return;

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
  if (!requireCredentials(admin, 'Admin')) return;

  await signIn(page, admin);

  await page.goto('/admin/orders');
  await expect(page).toHaveURL(/\/admin\/orders(?:[?#].*)?$/);

  await page.goto('/admin/payouts');
  await expect(page).toHaveURL(/\/admin\/payouts(?:[?#].*)?$/);
});

// Intentionally no live escrow-release mutation here. The canonical release
// function can move Stripe funds, so a mutation test must remain behind an
// explicit Stripe test-mode + seeded-order gate instead of running on every PR.
