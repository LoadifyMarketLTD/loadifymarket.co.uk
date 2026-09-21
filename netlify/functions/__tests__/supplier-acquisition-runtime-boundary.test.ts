import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260921151554_supplier_acquisition_runtime.sql'),
  'utf8',
);
const manualEndpoint = readFileSync(
  resolve(process.cwd(), 'netlify/functions/admin-direct-supplier-acquire.ts'),
  'utf8',
);
const controlEndpoint = readFileSync(
  resolve(process.cwd(), 'netlify/functions/admin-supplier-acquisition-control.ts'),
  'utf8',
);
const scheduler = readFileSync(
  resolve(process.cwd(), 'netlify/functions-modern/supplier-acquisition-scheduled.ts'),
  'utf8',
);

describe('Direct Supplier acquisition runtime boundary', () => {
  it('is disabled by default and requires explicit env config references', () => {
    expect(migration).toContain('acquisition_enabled boolean NOT NULL DEFAULT false');
    expect(migration).toContain("'manual','scheduled'");
    expect(migration).toContain("^env:[A-Z][A-Z0-9_]{2,127}$");
    expect(migration).toContain('supplier onboarding must be approved before acquisition can be enabled');
  });

  it('keeps run audit private, RLS protected and free of raw feed payloads', () => {
    expect(migration).toContain('private.supplier_acquisition_runs');
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('REVOKE ALL ON TABLE private.supplier_acquisition_runs');
    expect(migration).not.toContain('raw_payload');
    expect(migration).not.toContain('password text');
    expect(migration).not.toContain('private_key');
    expect(migration).not.toContain('api_key');
    expect(migration).toContain('Stores no raw feed payload and no supplier credential material');
  });

  it('restricts acquisition RPCs to service role', () => {
    expect(migration).toContain('server_supplier_acquisition_context_v1');
    expect(migration).toContain('server_supplier_acquisition_due_v1');
    expect(migration).toContain('server_supplier_acquisition_run_v1');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
  });

  it('keeps manual acquisition and controls admin-authenticated', () => {
    expect(manualEndpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(controlEndpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(manualEndpoint).toContain("trigger: 'manual'");
    expect(controlEndpoint).toContain('env:VARIABLE_NAME');
  });

  it('schedules only explicitly due suppliers every 15 minutes', () => {
    expect(scheduler).toContain("server_supplier_acquisition_due_v1");
    expect(scheduler).toContain("trigger: 'scheduled'");
    expect(scheduler).toContain("schedule: '*/15 * * * *'");
    expect(migration).toContain('p.acquisition_enabled=true');
    expect(migration).toContain("p.acquisition_mode='scheduled'");
  });

  it('contains no commerce or publication mutation', () => {
    expect(migration).not.toContain('INSERT INTO public.orders');
    expect(migration).not.toContain('supplier_marketplace_projections');
    expect(migration).toContain("'commercialActivationPerformed',false");
    expect(migration).toContain("'marketplaceListingPerformed',false");
  });
});
