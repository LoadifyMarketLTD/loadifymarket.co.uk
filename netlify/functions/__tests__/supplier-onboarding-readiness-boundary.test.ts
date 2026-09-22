import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260921115721_supplier_onboarding_qualification_readiness.sql'),
  'utf8',
);
const transactionMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260922145846_direct_supplier_transaction_capability_evidence.sql'),
  'utf8',
);
const capabilityApi = readFileSync(
  resolve(process.cwd(), 'netlify/functions/admin-supplier-onboarding-capability.ts'),
  'utf8',
);
const readinessApi = readFileSync(
  resolve(process.cwd(), 'netlify/functions/admin-supplier-onboarding-readiness.ts'),
  'utf8',
);

describe('supplier onboarding qualification and readiness boundary', () => {
  it('stores supplier-specific capability evidence in a private server-only table', () => {
    expect(migration).toContain('private.supplier_onboarding_capability_evidence');
    expect(migration).toContain('supplier_id uuid NOT NULL');
    expect(migration).toContain('supplier_onboarding_capability_unique');
    expect(migration).toContain('REVOKE ALL ON TABLE private.supplier_onboarding_capability_evidence');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated, service_role');
  });

  it('requires source-backed current evidence before a direct supplier adapter can become active', () => {
    expect(transactionMigration).toContain("NEW.provider_key='direct_supplier'");
    expect(transactionMigration).toContain('ce.supplier_id=NEW.supplier_id');
    expect(transactionMigration).toContain("ce.status='verified'");
    expect(transactionMigration).toContain('jsonb_array_length(ce.source_refs)>0');
    expect(transactionMigration).toContain('current supplier-specific capability evidence is required');
    expect(transactionMigration).toContain('write safety evidence is incomplete');
    expect(transactionMigration).toContain('minimum fulfilment PII permission is required');
  });

  it('preserves provider-level evidence guards for non-direct adapters', () => {
    expect(transactionMigration).toContain('private.supplier_commerce_provider_capabilities');
    expect(transactionMigration).toContain('pc.provider_key=NEW.provider_key');
    expect(transactionMigration).toContain("pc.status='verified'");
    expect(transactionMigration).toContain('pc.reverify_due_at>now()');
  });

  it('creates a fail-closed readiness snapshot without activating commerce or publishing', () => {
    expect(migration).toContain('server_supplier_onboarding_readiness_v1');
    expect(migration).toContain('catalogIngestionEligible');
    expect(migration).toContain('active_catalog_adapter_missing');
    expect(migration).toContain("'externalMutationPerformed',false");
    expect(migration).toContain("'commercialActivationPerformed',false");
    expect(migration).toContain("'marketplaceListingPerformed',false");
    expect(migration).not.toContain('UPDATE private.supplier_commerce_controls SET enabled=true');
  });

  it('keeps both admin endpoints authenticated and service-role RPC backed', () => {
    expect(capabilityApi).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(capabilityApi).toContain("server_admin_supplier_onboarding_capability_v1");
    expect(readinessApi).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(readinessApi).toContain("server_supplier_onboarding_readiness_v1");
  });
});
