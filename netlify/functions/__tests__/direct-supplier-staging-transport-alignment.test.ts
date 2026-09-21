import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260921125020_direct_supplier_staging_transport_alignment.sql'),
  'utf8',
);

describe('Direct Supplier durable staging transport alignment', () => {
  it('accepts the full provider-neutral transport contract in durable staging', () => {
    const allowlist = "'json_api','json_feed','feed_url','csv','xml','sftp','manual_catalog'";
    expect(migration).toContain('direct_supplier_batch_transport_check');
    expect(migration).toContain('direct_supplier_stage_transport_check');
    expect(migration.match(new RegExp(allowlist.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&'), 'g'))?.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps persistence service-role-only and commerce fail-closed', () => {
    expect(migration).toContain('server_persist_direct_supplier_feed_v1');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated, service_role');
    expect(migration).toContain('TO service_role');
    expect(migration).toContain("'commercialActivationPerformed', false");
    expect(migration).toContain("'capabilityPromotionPerformed', false");
    expect(migration).toContain("'marketplaceListingPerformed', false");
  });
});
