import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260921112414_supplier_onboarding_profiles.sql'),
  'utf8',
);
const endpoint = readFileSync(
  resolve(process.cwd(), 'netlify/functions/admin-supplier-onboarding-profile.ts'),
  'utf8',
);
const transportMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260921122708_supplier_onboarding_feed_url_and_source_format.sql'),
  'utf8',
);

describe('supplier onboarding profile boundary', () => {
  it('keeps supplier onboarding private, admin-only and provider-neutral', () => {
    expect(migration).toContain('private.supplier_onboarding_profiles');
    expect(migration).toContain("'direct_supplier','supplier_aggregator','wholesale_feed'");
    expect(migration).toContain("'json_api','json_feed','csv','xml','sftp','manual_catalog'");
    expect(migration).toContain('REVOKE ALL ON TABLE private.supplier_onboarding_profiles');
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
  });
  it('separates acquisition transport from source format and adds feed URL without enabling external acquisition', () => {
    expect(transportMigration).toContain("'json_api','json_feed','feed_url','csv','xml','sftp','manual_catalog'");
    expect(transportMigration).toContain('source_format text');
    expect(transportMigration).toContain("'json','csv','xml','canonical_json'");
    expect(transportMigration).toContain('configRef is required for remote supplier transports');
    expect(transportMigration).toContain("feed_transport IN ('feed_url','sftp')");
  });

  it('stores configuration references and commercial terms without accepting secrets', () => {
    expect(migration).toContain('config_ref text');
    expect(migration).toContain('commercial_terms_ref text');
    expect(endpoint).toContain('Secrets, credentials and payment data are not accepted');
    expect(endpoint).toContain('FORBIDDEN_KEYS');
    expect(endpoint).toContain('containsForbiddenKey(payload)');
  });

  it('cannot approve onboarding before Supplier Foundation approval and commercial terms', () => {
    expect(migration).toContain('supplier foundation approval is required before onboarding approval');
    expect(migration).toContain('commercialTermsRef is required before onboarding approval');
    expect(migration).toContain("'activationChanged',false");
  });

  it('does not create seller identities, orders, payments or listings', () => {
    expect(migration).not.toContain('INSERT INTO public.sellers');
    expect(migration).not.toContain('INSERT INTO public.orders');
    expect(migration).not.toContain('payment_intent');
    expect(migration).not.toContain('marketplace_projection');
  });
});
