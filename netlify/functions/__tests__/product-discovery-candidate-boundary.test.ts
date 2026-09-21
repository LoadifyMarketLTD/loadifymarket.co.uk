import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const endpoint = readFileSync(
  resolve(process.cwd(), 'netlify/functions/admin-product-discovery-candidate.ts'),
  'utf8',
);
const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260921101238_product_discovery_candidates.sql'),
  'utf8',
);

describe('product discovery candidate boundary', () => {
  it('requires active admin authority and server-side reinspection of the source URL', () => {
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(endpoint).toContain('previewOperatorProductUrl(url)');
    expect(endpoint).toContain("const METHODS = 'POST, OPTIONS'");
  });

  it('accepts only candidate-only preview governance and never creates commerce entities', () => {
    expect(endpoint).toContain('preview.governance.candidateOnly !== true');
    expect(endpoint).toContain('preview.governance.marketplaceListingAllowed !== false');
    expect(endpoint).toContain('preview.governance.commercialActivationAllowed !== false');
    expect(endpoint).toContain('supplierCreated: false');
    expect(endpoint).toContain('canonicalProductCreated: false');
    expect(endpoint).toContain('marketplaceListingCreated: false');
    expect(endpoint).toContain('commercialActivationPerformed: false');
  });

  it('stores discovery evidence in a private table with service-role-only access', () => {
    expect(migration).toContain('private.product_discovery_candidates');
    expect(migration).toContain("status text NOT NULL DEFAULT 'candidate'");
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
  });

  it('keeps discovery structurally separate from supplier offers and marketplace listings', () => {
    expect(migration).toContain("'marketplaceListingAllowed',false");
    expect(migration).toContain("'commercialActivationAllowed',false");
    expect(migration).toContain('Rows are not supplier offers, canonical products, marketplace listings or commercial activation evidence');
    expect(migration).not.toContain('INSERT INTO private.supplier_offers');
    expect(migration).not.toContain('INSERT INTO private.supplier_marketplace_projections');
  });
});
