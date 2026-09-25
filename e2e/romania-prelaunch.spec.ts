import { expect, test, type Page } from '@playwright/test';

const productId = '11111111-1111-4111-8111-111111111111';
const sellerId = '22222222-2222-4222-8222-222222222222';

const roProduct = {
  id: productId,
  title: 'Produs test România',
  description: 'Produs sintetic pentru verificarea fluxului România prelaunch.',
  price: 149.9,
  currency: 'RON',
  marketCodes: ['RO'],
  images: [],
  condition: 'new',
  stockQuantity: 4,
  views: 1,
  rating: 0,
  reviewCount: 0,
  createdAt: '2026-09-25T08:00:00.000Z',
  sellerId,
  type: 'retail',
  isActive: true,
  isApproved: true,
  listingStatus: 'active',
  listingContext: 'product',
  category: { name: 'Test România', slug: 'test-romania' },
  subcategory: null,
  specifications: { location: 'București' },
};

async function useRomaniaMarket(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('loadify-market-country', 'RO');
  });
}

async function mockRomaniaCatalog(page: Page) {
  await page.route('**/rest/v1/categories**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ name: 'Test România', slug: 'test-romania' }]),
    });
  });

  await page.route('**/rest/v1/seller_profiles_public**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        userId: sellerId,
        businessName: 'Seller Test România',
        isApproved: true,
        rating: 0,
        businessAddress: { city: 'București', country: 'România' },
      }]),
    });
  });

  await page.route('**/rest/v1/products**', async (route) => {
    const url = new URL(route.request().url());
    const isRelatedQuery = url.search.includes('id=neq.');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': isRelatedQuery ? '*/0' : '0-0/1' },
      body: JSON.stringify(isRelatedQuery ? [] : [roProduct]),
    });
  });

  await page.route('**/rest/v1/product_shipping**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
}

test('Romania synthetic catalogue to cart remains RON and checkout stays fail-closed', async ({ page }) => {
  await useRomaniaMarket(page);
  await mockRomaniaCatalog(page);

  await page.goto('/catalog', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  await expect(page.getByText('Produs test România').first()).toBeVisible();

  await page.getByText('Produs test România').first().click();
  await expect(page).toHaveURL(new RegExp('/product/' + productId + '$'));
  await expect(page.getByText(/149[,.]90\s*RON/).first()).toBeVisible();

  await page.evaluate(({ id, seller }) => {
    window.localStorage.setItem('loadify_cart', JSON.stringify([{
      product: {
        id,
        title: 'Produs test România',
        price: 149.9,
        currency: 'RON',
        marketCodes: ['RO'],
        category: 'Test România',
        subcategory: 'Test România',
        condition: 'New',
        location: 'București',
        seller,
        sellerId: '22222222-2222-4222-8222-222222222222',
        sellerVerified: true,
        unitCount: 4,
        rating: 0,
        reviewCount: 0,
        views: 1,
        listed: 'just now',
        listingContext: 'product',
        isAvailable: true,
        maxPurchaseQuantity: 4,
        image: '',
      },
      quantity: 1,
    }]));
  }, { id: productId, seller: 'Seller Test România' });

  await page.goto('/cart', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Produs test România')).toBeVisible();
  await expect(page.getByText(/149[,.]90\s*RON/).first()).toBeVisible();

  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', {
    name: 'Finalizarea comenzii nu este încă disponibilă în această piață',
  })).toBeVisible();
  await expect(page.getByText(/România este în pre-lansare/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Înapoi la catalog' })).toBeVisible();
});

test('Romania tracked order renders the order currency instead of a UK pound label', async ({ page }) => {
  await useRomaniaMarket(page);
  await page.route('**/.netlify/functions/track-shipment', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        order: {
          orderNumber: 'ORD-RO-SYNTHETIC',
          createdAt: '2026-09-25T08:00:00.000Z',
          total: 149.9,
          currency: 'RON',
          status: 'processing',
          product: { title: 'Produs test România', image: null },
          seller: { name: 'Seller Test România' },
        },
        shipment: null,
        events: [],
        state: 'being_prepared',
      }),
    });
  });

  await page.goto('/track-order', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Order Number *').fill('ORD-RO-SYNTHETIC');
  await page.getByLabel('Email Address *').fill('buyer@example.ro');
  await page.getByRole('button', { name: 'Track Order' }).click();
  await expect(page.getByText(/149[,.]90\s*RON/)).toBeVisible();
});


test('Romania legal pages render Romanian market-specific policy drafts while launch remains gated', async ({ page }) => {
  await useRomaniaMarket(page);
  const policies = [
    ['/buyer-terms', 'Termeni pentru cumpărători'],
    ['/returns-policy', 'Politica de retur'],
    ['/shipping-policy', 'Politica de livrare'],
    ['/privacy', 'Politica de confidențialitate'],
  ] as const;

  for (const [path, heading] of policies) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    await expect(page.getByText(/proiect pre-lansare/i)).toBeVisible();
  }
});


test('Romania online withdrawal link is exposed from legal content and buyer route stays protected', async ({ page }) => {
  await useRomaniaMarket(page);

  await page.goto('/buyer-terms', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: 'Retrageți-vă din contract aici' })).toHaveAttribute('href', '/buyer/withdrawal');

  await page.goto('/returns-policy', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: 'Retrageți-vă din contract aici' })).toHaveAttribute('href', '/buyer/withdrawal');

  await page.goto('/buyer/withdrawal', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe('/login');
});
