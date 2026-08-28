import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const platformFlags = read('netlify/functions/_shared/platformFlags.ts');
const routeSurfaceClass = read('src/components/RouteSurfaceClass.tsx');
const editorCss = read('src/seller-listing-editor-light.css');
const main = read('src/main.tsx');
const directPublishMigration = read(
  'supabase/migrations/20260828123500_marketplace_seller_direct_publish.sql',
);

describe('Marketplace Seller direct publication contract', () => {
  it('retires the owner pre-approval flag as a publication gate', () => {
    expect(platformFlags).toContain('autoApproveProducts: true');
    expect(platformFlags).toContain("if (key === 'autoApproveProducts') continue");
    expect(platformFlags).toContain('Marketplace Seller publication no longer waits for owner approval');
  });

  it('backfills and server-enforces the compatibility approval column', () => {
    expect(directPublishMigration).toContain('ALTER COLUMN "isApproved" SET DEFAULT true');
    expect(directPublishMigration).toContain('SET "isApproved" = true');
    expect(directPublishMigration).toContain('trg_products_auto_approval_v1');
    expect(directPublishMigration).toContain('NEW."isApproved" := true');
  });
});

describe('Seller listing editor light surface contract', () => {
  it('loads a route-scoped light editor stylesheet', () => {
    expect(main).toContain('RouteSurfaceClass');
    expect(main).toContain('seller-listing-editor-light.css');
    expect(editorCss).toContain('.loadify-seller-listing-route');
    expect(editorCss).toContain('background: #f8fafc !important');
    expect(editorCss).toContain('background: #ffffff !important');
  });

  it('removes the seller-facing admin-approval instruction', () => {
    expect(routeSurfaceClass).toContain('DIRECT_PUBLISH_COPY');
    expect(routeSurfaceClass).toContain('make your product live on the marketplace');
    expect(routeSurfaceClass).toContain('LEGACY_APPROVAL_COPY');
  });

  it('hides retired manual approval controls without changing moderation controls', () => {
    expect(editorCss).toContain('.loadify-admin-products-route table th:nth-child(6)');
    expect(editorCss).toContain('lucide-shield-check');
    expect(editorCss).toContain('.loadify-admin-settings-route');
    expect(editorCss).toContain('.loadify-seller-products-route');
  });
});
