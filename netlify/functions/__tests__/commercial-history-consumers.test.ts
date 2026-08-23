import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepo = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const invoice = readRepo('netlify/functions/generate-invoice.ts');
const tracking = readRepo('netlify/functions/track-shipment.ts');
const mobileOrders = readRepo('src/pages/MobileOrdersPage.tsx');
const buyerOrders = readRepo('src/pages/pixel-perfect/buyer/BuyerOrders.tsx');
const buyerDashboard = readRepo('src/pages/pixel-perfect/buyer/BuyerDashboard.tsx');
const buyerReviews = readRepo('src/pages/pixel-perfect/buyer/BuyerReviews.tsx');
const sellerOrders = readRepo('src/pages/pixel-perfect/seller/SellerOrders.tsx');
const sellerDashboard = readRepo('src/pages/pixel-perfect/seller/SellerDashboard.tsx');

describe('immutable commercial-history consumers', () => {
  it('invoice uses order/item snapshots and isolates live identity to legacy fallback', () => {
    expect(invoice).toContain('commercialSnapshotSource');
    expect(invoice).toContain('buyerNameSnapshot');
    expect(invoice).toContain('buyerEmailSnapshot');
    expect(invoice).toContain('sellerBusinessNameSnapshot');
    expect(invoice).toContain('productTitleSnapshot');
    expect(invoice).toContain('productSnapshotSource');
    expect(invoice).toContain('if (!hasCommercialSnapshot)');
  });

  it('tracking authenticates/displays post-cutover history from immutable snapshots', () => {
    expect(tracking).toContain('buyerEmailSnapshot');
    expect(tracking).toContain('sellerBusinessNameSnapshot');
    expect(tracking).toContain('commercialSnapshotSource');
    expect(tracking).toContain('productTitleSnapshot');
    expect(tracking).toContain('productImageSnapshot');
    expect(tracking).toContain('productSnapshotSource');
    expect(tracking).toContain('if (!hasCommercialSnapshot)');
  });

  it('buyer order surfaces prefer immutable product identity', () => {
    expect(mobileOrders).toContain('productSnapshotSource');
    expect(mobileOrders).toContain('productTitleSnapshot');
    expect(mobileOrders).toContain('productImageSnapshot');
    expect(buyerOrders).toContain('order_items(productTitleSnapshot)');
    expect(buyerDashboard).toContain('order_items(productTitleSnapshot, productSnapshotSource)');
  });

  it('seller order surfaces prefer checkout-time buyer identity', () => {
    for (const source of [sellerOrders, sellerDashboard]) {
      expect(source).toContain('buyerNameSnapshot');
      expect(source).toContain('commercialSnapshotSource');
      expect(source).toContain('legacyBuyer');
    }
  });

  it('reviewable purchase identity uses the order-item snapshot when available', () => {
    expect(buyerReviews).toContain('productTitleSnapshot');
    expect(buyerReviews).toContain('productSnapshotSource');
    expect(buyerReviews).toContain('snapshotItem');
  });
});