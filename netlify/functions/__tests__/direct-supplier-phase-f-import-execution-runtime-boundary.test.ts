import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Direct Supplier Phase F execution runtime boundary', () => {
  it('deploys only through the configured modern Netlify wrapper', () => {
    const wrapper = repo('netlify/functions-modern/admin-direct-supplier-phase-f-import-execute.ts');
    expect(wrapper).toContain("../functions/admin-direct-supplier-phase-f-import-execute");
    expect(wrapper).toContain('withLambda(handler)');
  });

  it('requires active admin authority, a hosted OFF-by-default gate and explicit confirmation', () => {
    const endpoint = repo('netlify/functions/admin-direct-supplier-phase-f-import-execute.ts');
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(endpoint).toContain("process.env.DIRECT_SUPPLIER_PHASE_F_EXECUTION_ENABLED === 'true'");
    expect(endpoint).toContain("const EXECUTION_CONFIRMATION = 'EXECUTE_PHASE_F_IMPORT'");
    expect(endpoint).toContain('if (!executionEnabled)');
    expect(endpoint).toContain('if (!confirmed)');
  });

  it('re-derives execution from durable staging, authentic Supplier Foundation binding and the existing planner', () => {
    const endpoint = repo('netlify/functions/admin-direct-supplier-phase-f-import-execute.ts');
    expect(endpoint).toContain('readDirectSupplierStagingReview');
    expect(endpoint).toContain('resolveDirectSupplierFoundationBinding');
    expect(endpoint).toContain('evaluateDirectSupplierIntakeGovernance');
    expect(endpoint).toContain('prepareDirectSupplierPhaseFImportPlan');
    expect(endpoint).toContain('executeDirectSupplierPhaseFImportPlan');
    expect(endpoint).toContain('value.length > 500');
  });

  it('accepts no provider credentials, payment credentials or incomplete canonical mappings', () => {
    const endpoint = repo('netlify/functions/admin-direct-supplier-phase-f-import-execute.ts');
    const executor = repo('netlify/functions/_shared/directSupplierPhaseFImportExecution.ts');
    expect(endpoint).toContain('Secrets, provider credentials and payment credentials are not accepted');
    expect(endpoint).toContain('!canonicalProductId');
    expect(executor).toContain("reason: 'canonical_product_mapping_required'");
    expect(executor).toContain('item.canonicalProductId');
  });

  it('can call only the two existing Phase F capture actions and keeps all downstream commerce effects false', () => {
    const executor = repo('netlify/functions/_shared/directSupplierPhaseFImportExecution.ts');
    const endpoint = repo('netlify/functions/admin-direct-supplier-phase-f-import-execute.ts');
    expect(executor).toContain("'create_import_batch' | 'record_import_item'");
    expect(executor).toContain("input.mutate('create_import_batch'");
    expect(executor).toContain("input.mutate('record_import_item'");
    expect(endpoint).toContain('mutateSupplierImport(admin, auth.actor.id, action, payload)');
    expect(endpoint).not.toContain('submitOrder(');
    expect(endpoint).not.toContain('server_mutate_supplier_catalog_v1');
    expect(endpoint).not.toContain('stripe.');
    expect(executor).toContain('canonicalIdentityMutationPerformed: false');
    expect(executor).toContain('supplierCatalogMutationPerformed: false');
    expect(executor).toContain('marketplaceListingPerformed: false');
    expect(executor).toContain('commercialActivationPerformed: false');
    expect(executor).toContain('providerWriteMutationPerformed: false');
    expect(executor).toContain('supplierOrderMutationPerformed: false');
    expect(executor).toContain('customerPiiDisclosurePerformed: false');
    expect(executor).toContain('financialMutationPerformed: false');
  });

  it('retains Phase F review obligations after capture rather than auto-approving or publishing', () => {
    const endpoint = repo('netlify/functions/admin-direct-supplier-phase-f-import-execute.ts');
    expect(endpoint).toContain('normalizedFacts: true');
    expect(endpoint).toContain('assetRights: true');
    expect(endpoint).toContain('compliance: true');
    expect(endpoint).toContain('marketplacePublication: true');
    expect(endpoint).toContain('commercialActivation: true');
    expect(endpoint).not.toContain("'set_import_item_status'");
    expect(endpoint).not.toContain("'record_compliance_review'");
  });
});
