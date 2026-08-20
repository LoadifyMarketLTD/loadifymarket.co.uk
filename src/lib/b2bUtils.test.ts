import { describe, expect, it } from 'vitest';
import {
  applyVatReverseCharge,
  effectivePriceForBuyer,
  isB2BBuyer,
  priceLabelForBuyer,
} from './b2bUtils';

describe('marketplace B2B price/tax helpers', () => {
  it('still classifies a business account as B2B', () => {
    expect(isB2BBuyer({ accountType: 'company' })).toBe(true);
    expect(isB2BBuyer({ accountType: 'individual' })).toBe(false);
  });

  it('does not infer reverse charge from a verified buyer VAT number', () => {
    expect(applyVatReverseCharge({
      accountType: 'company',
      isVatVerified: true,
      vatNumber: 'GB123456789',
    })).toBe(false);
  });

  it('never removes 20% from the seller-entered price based only on buyer profile', () => {
    const profile = {
      accountType: 'company',
      isVatVerified: true,
      vatNumber: 'GB123456789',
    };
    expect(effectivePriceForBuyer(120, profile)).toBe(120);
    expect(priceLabelForBuyer(120, profile)).toContain('£120.00');
    expect(priceLabelForBuyer(120, profile)).not.toMatch(/inc VAT|ex VAT/i);
  });
});
