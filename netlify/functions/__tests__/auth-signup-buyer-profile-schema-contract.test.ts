import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sql = fs.readFileSync(
  path.join(
    root,
    'supabase/migrations/20260825201500_auth_signup_intent_consumption.sql',
  ),
  'utf8',
);

describe('Buyer signup intent profile schema contract', () => {
  const buyerSection =
    sql.split("v_intent.requested_role = 'buyer' THEN")[1]
      ?.split("ELSIF v_intent_id IS NOT NULL AND v_intent.requested_role = 'seller' THEN")[0] ?? '';

  it('uses the hosted buyer_profiles accountType field, not a non-existent customerType field', () => {
    expect(buyerSection).toContain('UPDATE public.buyer_profiles');
    expect(buyerSection).toContain('"accountType"');
    expect(buyerSection).not.toContain('"customerType"');
  });

  it('projects the full existing Buyer business-profile payload from the private intent', () => {
    expect(buyerSection).toContain('v_intent.customer_type');
    expect(buyerSection).toContain('"companyName"');
    expect(buyerSection).toContain('v_intent.company_name');
    expect(buyerSection).toContain('"vatNumber"');
    expect(buyerSection).toContain('v_intent.vat_number');
    expect(buyerSection).toContain('"businessAddress"');
    expect(buyerSection).toContain('v_intent.business_address');
  });
});
