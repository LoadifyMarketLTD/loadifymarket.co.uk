import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const migration = repo('supabase/migrations/20260922145846_direct_supplier_transaction_capability_evidence.sql');
const capabilityApi = repo('netlify/functions/admin-supplier-onboarding-capability.ts');
const foundationApi = repo('netlify/functions/admin-supplier-foundation.ts');
const adapterContract = repo('netlify/functions/_shared/supplierAdapter.ts');
const orderRuntime = repo('netlify/functions/_shared/supplierOrderHandshake.ts');
const pilotRuntime = repo('netlify/functions/admin-supplier-pilot-runtime.ts');
const integrationMigration = repo('supabase/migrations/20260922154827_direct_supplier_multi_transport_pilot_readiness.sql');
const runtimeFactory = repo('netlify/functions/_shared/supplierAdapterRuntimeFactory.ts');
const universalAdapter = repo('netlify/functions/_shared/universalDirectSupplierAdapter.ts');

describe('direct supplier transaction readiness boundary', () => {
  it('records execution mode, write, PII, idempotency and recovery evidence separately', () => {
    for (const phrase of [
      'execution_mode',
      'write_allowed',
      'pii_allowed',
      'pii_fields',
      'idempotency_known',
      'lost_response_recovery_known',
      'rate_limit_known',
      'contract_ref',
    ]) expect(migration).toContain(phrase);
    expect(capabilityApi).toContain('executionMode');
    expect(capabilityApi).toContain('lostResponseRecoveryKnown');
    expect(capabilityApi).toContain('piiFields');
  });

  it('requires explicit safe write evidence before direct supplier order execution can be advertised', () => {
    expect(migration).toContain("execution_mode='automated_write'");
    expect(migration).toContain('write_allowed=true');
    expect(migration).toContain('idempotency_known=true');
    expect(migration).toContain('lost_response_recovery_known=true');
    expect(migration).toContain("pii_fields @> ARRAY['name','line1','city','postcode','country']");
    expect(migration).toContain('order submission requires acknowledgement capability');
  });

  it('keeps minimum fulfilment PII server-only, scoped to an active pilot, and never returns billing data', () => {
    expect(migration).toContain('server_supplier_order_fulfilment_disclosure_v1');
    expect(migration).toContain("p.status='active'");
    expect(migration).toContain('supplier_pilot_cohort_members');
    expect(migration).toContain('server_supplier_commerce_control_decision_v1');
    expect(migration).toContain("'billingAddressDisclosed',false");
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
    expect(migration).not.toContain('billingAddress->');
  });

  it('passes only the server-authorised recipient envelope to a direct supplier adapter', () => {
    expect(adapterContract).toContain('SupplierFulfilmentRecipient');
    expect(adapterContract).toContain('recipient?: SupplierFulfilmentRecipient');
    expect(orderRuntime).toContain('server_supplier_order_fulfilment_disclosure_v1');
    expect(orderRuntime).toContain("prepared.providerKey === 'direct_supplier'");
    expect(orderRuntime.indexOf('server_supplier_order_fulfilment_disclosure_v1'))
      .toBeLessThan(orderRuntime.indexOf('server_mark_supplier_order_submission_started_v1'));
    expect(orderRuntime).not.toContain('billingAddress');
  });

  it('does not allow evidence alone to activate Direct Supplier runtime', () => {
    expect(foundationApi).toContain('loadSupplierIntegrationRuntime');
    expect(foundationApi).toContain('UniversalDirectSupplierAdapterV1');
    expect(foundationApi).toContain('transactional runtime bindings are not executable');
    expect(pilotRuntime).toContain('server_supplier_capability_execution_v1');
    expect(pilotRuntime).toContain('loadSupplierIntegrationRuntime');
    expect(pilotRuntime).toContain('direct_supplier_runtime_binding_not_executable');
    expect(runtimeFactory).toContain('server_supplier_offer_integration_context_v1');
    expect(runtimeFactory).toContain('loadSupplierIntegrationRuntime');
    expect(universalAdapter).toContain('resolveSupplierRuntimeConfig');
  });

  it('uses supplier-specific multi-transport bindings instead of the legacy single-adapter rule for Direct Supplier', () => {
    expect(integrationMigration).toContain("v_pilot.provider_key='direct_supplier'");
    expect(integrationMigration).toContain('direct_supplier_integration_bindings');
    expect(integrationMigration).toContain('verified_automated_order_binding_required');
    expect(integrationMigration).toContain('verified_acknowledgement_binding_required');
    expect(integrationMigration).toContain("'universal_supplier_integration_kit'");
    expect(integrationMigration).toContain("'single_verified_full_capability_adapter'");
  });
});
