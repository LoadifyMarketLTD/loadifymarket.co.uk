import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sellerOrders = fs.readFileSync(
  path.join(repoRoot, 'src/pages/pixel-perfect/seller/SellerOrders.tsx'),
  'utf8',
);
const sellerOrderStatus = fs.readFileSync(
  path.join(repoRoot, 'netlify/functions/seller-order-status.ts'),
  'utf8',
);

describe('seller order fulfilment UI/server contract', () => {
  it('only offers seller delivered transition for service listings', () => {
    expect(sellerOrderStatus).toContain("return listingContext === 'service'");
    expect(sellerOrders).toContain('o.listingContext === "service"');
    expect(sellerOrders).toContain('Mark Job as Completed');
  });

  it('routes physical shipped orders to shipment management instead of a rejected delivered mutation', () => {
    expect(sellerOrders).toContain('navigate("/seller/shipments")');
    expect(sellerOrders).toContain('Manage Shipment');
  });
});
