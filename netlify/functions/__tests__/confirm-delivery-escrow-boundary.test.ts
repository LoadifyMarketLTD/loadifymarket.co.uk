import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const confirmDelivery = fs.readFileSync(path.join(repoRoot, 'netlify/functions/confirm-delivery.ts'), 'utf8');
const buyerOrders = fs.readFileSync(path.join(repoRoot, 'src/pages/pixel-perfect/buyer/BuyerOrders.tsx'), 'utf8');
const escrowRelease = fs.readFileSync(path.join(repoRoot, 'netlify/functions/escrow-release.ts'), 'utf8');

describe('buyer delivery confirmation escrow boundary', () => {
  it('does not release escrow or mark the order completed from confirm-delivery', () => {
    expect(confirmDelivery).toContain("status: 'delivered'");
    expect(confirmDelivery).toContain('fundsReleased: false');
    expect(confirmDelivery).not.toContain("escrowStatus: 'released'");
    expect(confirmDelivery).not.toContain("status: 'completed',");
    expect(confirmDelivery).not.toContain('Funds have been released');
    expect(confirmDelivery).not.toContain('funds released');
  });

  it('keeps Stripe transfer authority in the scheduled escrow-release boundary', () => {
    expect(escrowRelease).toContain(".eq('status', 'delivered')");
    expect(escrowRelease).toContain(".eq('escrowStatus', 'held')");
    expect(escrowRelease).toContain('stripe.transfers.create');
    expect(escrowRelease).toContain('ESCROW_WINDOW_DAYS');
  });

  it('does not tell the buyer that confirmation released seller funds', () => {
    expect(buyerOrders).toContain('Seller funds remain protected until the escrow release checks and protection window are complete.');
    expect(buyerOrders).not.toContain('Funds have been released to the seller');
  });
});
