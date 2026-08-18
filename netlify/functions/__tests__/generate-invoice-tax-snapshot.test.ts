import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(process.cwd(), 'netlify/functions/generate-invoice.ts'),
  'utf8',
);

describe('generate-invoice tax snapshot contract', () => {
  it('derives historical reverse-charge treatment from the order snapshot', () => {
    expect(source).toContain('isB2B');
    expect(source).toContain("const isReverseCharge = isB2B && pence(order.vatAmount) === 0;");
    expect(source).not.toContain("select('accountType, companyName, vatNumber, isVatVerified')");
    expect(source).not.toContain('Boolean(buyerProfile?.isVatVerified)');
  });

  it('mirrors Stripe reverse-charge rounding per unit for invoice lines', () => {
    expect(source).toContain('const catalogUnitPence = pence(item.pricePerUnit);');
    expect(source).toContain('Math.round((catalogUnitPence / 100 / VAT_DIVISOR) * 100)');
    expect(source).toContain('const lineTotalPence = chargedUnitPence * quantity;');
  });

  it('renders stored order totals rather than recomputing the amount paid', () => {
    expect(source).toContain('const subtotalPence = pence(order.subtotal);');
    expect(source).toContain('const vatPence = pence(order.vatAmount);');
    expect(source).toContain('const shippingPence = pence(order.shippingAmount);');
    expect(source).toContain('const totalPence = pence(order.total);');
  });
});
