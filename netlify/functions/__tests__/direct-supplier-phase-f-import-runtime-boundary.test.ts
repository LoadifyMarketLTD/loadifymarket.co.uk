import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Direct Supplier Phase F import planner runtime boundary', () => {
  it('deploys through the configured modern Netlify directory', () => {
    const wrapper = repo('netlify/functions-modern/admin-direct-supplier-phase-f-import-plan.ts');
    expect(wrapper).toContain("../functions/admin-direct-supplier-phase-f-import-plan");
    expect(wrapper).toContain('withLambda(handler)');
  });

  it('requires active admin authority and reads only existing staging/foundation evidence', () => {
    const endpoint = repo('netlify/functions/admin-direct-supplier-phase-f-import-plan.ts');
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(endpoint).toContain('readDirectSupplierStagingReview');
    expect(endpoint).toContain('resolveDirectSupplierFoundationBinding');
    expect(endpoint).toContain('evaluateDirectSupplierIntakeGovernance');
    expect(endpoint).toContain('prepareDirectSupplierPhaseFImportPlan');
  });

  it('does not execute supplier import, catalog, listing, payment or provider mutations', () => {
    const endpoint = repo('netlify/functions/admin-direct-supplier-phase-f-import-plan.ts');
    expect(endpoint).not.toContain('mutateSupplierImport(');
    expect(endpoint).not.toContain('server_mutate_supplier_import_v1');
    expect(endpoint).not.toContain('server_mutate_supplier_catalog_v1');
    expect(endpoint).not.toContain('submitOrder(');
    expect(endpoint).not.toContain('stripe.');
    expect(endpoint).toContain('mutationPerformed: false');
    expect(endpoint).toContain('supplierImportMutationCalled: false');
    expect(endpoint).toContain('marketplaceListingPerformed: false');
    expect(endpoint).toContain('commercialActivationPerformed: false');
  });

  it('caps operator-supplied Phase E mappings to the staging review maximum', () => {
    const endpoint = repo('netlify/functions/admin-direct-supplier-phase-f-import-plan.ts');
    expect(endpoint).toContain('value.length > 500');
  });

  it('reuses the existing Phase F actions rather than introducing a parallel import engine', () => {
    const planner = repo('netlify/functions/_shared/directSupplierPhaseFImportPlan.ts');
    expect(planner).toContain("action: 'create_import_batch'");
    expect(planner).toContain("action: 'record_import_item'");
    expect(planner).toContain("providerKey: 'direct_supplier'");
    expect(planner).toContain('normalizedFactsExecutionDeferred: true');
    expect(planner).toContain('assetRightsExecutionDeferred: true');
    expect(planner).toContain('complianceExecutionDeferred: true');
  });
});
