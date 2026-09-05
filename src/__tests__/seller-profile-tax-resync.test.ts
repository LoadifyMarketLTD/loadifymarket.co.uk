import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepo = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const sellerProfile = readRepo('src/pages/pixel-perfect/seller/SellerProfile.tsx');

describe('seller profile tax evidence recovery', () => {
  it('refreshes Stripe tax-location evidence before a confirmed GB declaration is saved', () => {
    expect(sellerProfile).toContain('requestedTaxConfirmation');
    expect(sellerProfile).toContain('/.netlify/functions/connect-status');
    expect(sellerProfile).toContain('taxDeclarationConfirmed: requestedTaxConfirmation');
  });

  it('updates the provisioned seller profile instead of using an ON CONFLICT insert path', () => {
    expect(sellerProfile).toMatch(/from\("seller_profiles"\)\s*\.update\(/);
    expect(sellerProfile).not.toMatch(/from\("seller_profiles"\)\s*\.upsert\(/);
    expect(sellerProfile).toContain('.select("userId")');
    expect(sellerProfile).toContain('Seller profile is missing. Please contact support before continuing.');
  });

  it('reads back the persisted declaration instead of assuming the database accepted it', () => {
    expect(sellerProfile).toContain('persistedTaxConfirmed');
    expect(sellerProfile).toContain('setTaxDeclarationConfirmed(persistedTaxConfirmed)');
    expect(sellerProfile).toContain('Profile saved — tax setup still required');
    expect(sellerProfile).toContain('Stripe tax-location evidence is not ready');
  });

  it('keeps VAT-registered live checkout fail-closed while allowing draft catalogue work', () => {
    expect(sellerProfile).toContain('The current live checkout tax boundary does not yet support VAT-registered seller listings');
    expect(sellerProfile).toContain('products can still be saved as drafts');
  });
});
