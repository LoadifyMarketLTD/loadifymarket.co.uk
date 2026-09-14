import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateSellerSettlementPence } from '../_shared/stripeSettlement';

describe('marketplace seller settlement policy', () => {
  it('deducts actual Stripe processing separately from Loadify commission', () => {
    expect(calculateSellerSettlementPence({
      grossPence: 1_000,
      commissionPence: 0,
      processingFeePence: 35,
    })).toBe(965);

    expect(calculateSellerSettlementPence({
      grossPence: 1_000,
      commissionPence: 70,
      processingFeePence: 35,
    })).toBe(895);
  });

  it('fails closed for invalid evidence or non-positive settlement', () => {
    expect(() => calculateSellerSettlementPence({
      grossPence: 1_000,
      commissionPence: 0,
      processingFeePence: 1_001,
    })).toThrow('equal or exceed');
    expect(() => calculateSellerSettlementPence({
      grossPence: 1_000,
      commissionPence: 0,
      processingFeePence: 35.5,
    })).toThrow('invalid monetary');
  });

  it('uses a manual connected-account schedule and a weekly £25 payout gate', () => {
    const onboarding = readFileSync(resolve(process.cwd(), 'netlify/functions/connect-onboard.ts'), 'utf8');
    const payout = readFileSync(resolve(process.cwd(), 'netlify/functions/seller-bank-payout.ts'), 'utf8');
    const config = readFileSync(resolve(process.cwd(), 'netlify.toml'), 'utf8');

    expect(onboarding).toContain("interval: 'manual'");
    expect(payout).toContain('MINIMUM_PAYOUT_PENCE = 2_500');
    expect(payout).toContain("schedule('0 8 * * 5'");
    expect(config).toContain('[functions."seller-bank-payout"]');
  });

  it('records the exact Stripe balance transaction in the payout ledger', () => {
    const release = readFileSync(resolve(process.cwd(), 'netlify/functions/escrow-release.ts'), 'utf8');
    const migration = readFileSync(resolve(process.cwd(), 'supabase/613_seller_settlement_fee_transparency.sql'), 'utf8');

    expect(release).toContain('retrieveStripeProcessingFee(stripe, latestCharge)');
    expect(release).toContain('stripeBalanceTransactionId: feeEvidence.balanceTransactionId');
    expect(migration).toContain('"stripeBalanceTransactionId"');
    expect(migration).toContain('payouts_settlement_reconciles');
  });
});
