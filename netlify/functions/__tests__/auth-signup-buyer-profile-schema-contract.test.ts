import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const provisioningSql = fs.readFileSync(
  path.join(
    root,
    'supabase/migrations/20260825201500_auth_signup_intent_consumption.sql',
  ),
  'utf8',
);
const foundationSql = fs.readFileSync(
  path.join(
    root,
    'supabase/migrations/20260825200500_signup_intent_auth_foundation.sql',
  ),
  'utf8',
);
const registerIntent = fs.readFileSync(
  path.join(root, 'netlify/functions/register-intent.ts'),
  'utf8',
);

const canonicalBuyerAccountTypes = [
  'individual',
  'sole_trader',
  'limited_company',
  'partnership',
  'charity',
  'other',
];

describe('Buyer signup intent profile schema contract', () => {
  const buyerSection =
    provisioningSql.split("v_intent.requested_role = 'buyer' THEN")[1]
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

  it('accepts only Buyer account types allowed by the hosted buyer_profiles constraint', () => {
    for (const accountType of canonicalBuyerAccountTypes) {
      expect(registerIntent).toContain(`'${accountType}'`);
      expect(foundationSql).toContain(`'${accountType}'`);
    }

    expect(registerIntent).not.toContain("'business',\n    'reseller'");
    expect(registerIntent).not.toContain("'reseller',\n    'distributor'");
    expect(foundationSql).toContain('signup_intents_customer_type_contract');
    expect(foundationSql).toContain('invalid buyer account type');
    expect(foundationSql).toContain('seller intent cannot carry buyer account type');
  });
});
