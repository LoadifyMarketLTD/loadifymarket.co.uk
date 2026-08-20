import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const migration = read('../../../supabase/612_marketplace_tax_evidence_guard.sql');
const connectStatus = read('../connect-status.ts');
const webCheckout = read('../create-checkout.ts');
const mobileCheckout = read('../create-payment-intent.ts');
const receipt = read('../generate-invoice.ts');

describe('P1 marketplace tax evidence contract', () => {
  it('fails the cutover closed when a payment is already in flight', () => {
    expect(migration).toContain("WHERE ps.status = 'pending'");
    expect(migration).toContain("WHERE o.status = 'awaiting_payment'");
    expect(migration).toContain('612 tax cutover blocked: pending payment_sessions exist');
    expect(migration).toContain('612 tax cutover blocked: awaiting_payment orders exist');
  });

  it('captures seller tax country from Stripe Connect rather than user-entered postcode', () => {
    expect(connectStatus).toContain('account.country?.trim()');
    expect(connectStatus).toContain("stripeUpdate.taxCountrySource = 'stripe_connect_account_v1'");
    expect(connectStatus).toContain('stripeUpdate.taxCountryCapturedAt = new Date().toISOString()');
    expect(migration).toContain("v_tax_country_source IS DISTINCT FROM 'stripe_connect_account_v1'");
    expect(migration).toContain('seller tax country is not verified from Stripe Connect');
  });

  it('prevents browser roles from forging Stripe-derived seller tax-country evidence', () => {
    expect(migration).toContain('private.protect_seller_tax_country_evidence_v1()');
    expect(migration).toContain("auth.role() IS DISTINCT FROM 'service_role'");
    expect(migration).toContain('NEW.\"taxCountry\" := OLD.\"taxCountry\"');
    expect(migration).toContain('trg_protect_seller_tax_country_evidence_v1');
  });

  it('derives current listing tax evidence on every product write and normalises non-VAT sellers to zero VAT', () => {
    expect(migration).toContain('private.apply_marketplace_product_tax_evidence_v1()');
    expect(migration).toContain('BEFORE INSERT OR UPDATE ON public.products');
    expect(migration).toContain("NEW.\"taxTreatmentStatus\" := 'seller_non_vat_declared'");
    expect(migration).toContain('NEW.\"vatRate\" := 0');
    expect(migration).toContain('NEW.\"priceExVat\" := NEW.price');
    expect(migration).toContain("NEW.\"taxTreatmentSource\" := 'seller_profile_declaration_v1'");
  });

  it('blocks the old automatic B2B reverse-charge assumption instead of trusting buyer VAT state', () => {
    // Both clients still expose the old calculation before the DB boundary. The P1
    // intentionally turns that state into a hard rejection, preventing any reduced
    // Stripe amount from being materialised under an unproved reverse-charge rule.
    expect(webCheckout).toContain('const applyReverseCharge = isB2BBuyer && Boolean(buyerProfile?.isVatVerified)');
    expect(mobileCheckout).toContain('const applyReverseCharge = isB2BBuyer && Boolean(buyerProfile?.isVatVerified)');
    expect(migration).toContain("COALESCE((v_metadata ->> 'applyReverseCharge')::boolean, false)");
    expect(migration).toContain('reverse charge requires explicit versioned tax-engine evidence');
  });

  it('persists one immutable tax snapshot and materialises zero VAT from that evidence', () => {
    expect(migration).toContain("v_metadata := jsonb_set(v_metadata, '{taxSnapshotVersion}', '1'::jsonb, true)");
    expect(migration).toContain("'treatment', 'seller_non_vat_declared'");
    expect(migration).toContain("'vatAmountPence', 0");
    expect(migration).toContain('v_subtotal := round(v_product_paid, 2)');
    expect(migration).toContain('v_vat := 0');
    expect(migration).toContain('v_existing_item.\"vatRate\" IS DISTINCT FROM 0');
    expect(migration).toContain('v_existing_item.subtotal IS DISTINCT FROM round(v_item_price * v_item_quantity, 2)');
    expect(migration).not.toContain('v_product_paid / 1.20');
  });

  it('keeps the existing atomic order materializer and service-role boundary', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.server_materialize_paid_order_v1');
    expect(migration).toContain("v_session.status NOT IN ('pending', 'completed')");
    expect(migration).toContain('FOR UPDATE');
    expect(migration).toContain('PERFORM public.finalize_paid_order_item');
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.server_materialize_paid_order_v1(uuid, text, numeric)\n  TO service_role");
  });

  it('renders new orders as evidence-backed receipts without attributing Loadify VAT to the seller', () => {
    expect(receipt).toContain('ORDER RECEIPT');
    expect(receipt).toContain("order.taxTreatmentSnapshot === 'seller_non_vat_declared'");
    expect(receipt).toContain('VAT not charged:');
    expect(receipt).toContain('This is an order receipt, not a VAT invoice.');
    expect(receipt).not.toContain('process.env.VITE_VAT_NUMBER');
    expect(receipt).not.toContain('VAT (20%)');
  });
});
