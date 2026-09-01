import { describe, expect, it } from 'vitest';
import { canPerformFinancialMutation } from '../_shared/autonomousOperationsFoundation';
import {
  createProviderExecutionCapabilityRegistry,
  getProviderExecutionContract,
  listProviderExecutionContracts,
} from '../_shared/providerExecutionContracts';

describe('provider execution contracts', () => {
  it('maps only live-verified Avasam catalogue/stock/price as verified read capabilities', () => {
    const verifiedRead = listProviderExecutionContracts()
      .filter(contract => contract.provider === 'avasam' && contract.status === 'verified_read')
      .map(contract => contract.capability)
      .sort();

    expect(verifiedRead).toEqual(['catalog', 'price', 'stock']);
    for (const capability of verifiedRead) {
      const contract = getProviderExecutionContract('avasam', capability);
      expect(contract.record.verified).toBe(true);
      expect(contract.record.verificationStatus).toBe('runtime_verified');
      expect(contract.record.readAllowed).toBe(true);
      expect(contract.record.writeAllowed).toBe(false);
      expect(contract.record.piiAllowed).toBe(false);
    }
  });

  it('keeps Avasam cancellation manual-only and all transactional automation disabled', () => {
    const cancellation = getProviderExecutionContract('avasam', 'cancellation');
    expect(cancellation.status).toBe('manual_only');
    expect(cancellation.record.autonomyLevel).toBe('human_approval');
    expect(cancellation.record.writeAllowed).toBe(false);

    const order = getProviderExecutionContract('avasam', 'order_submission');
    expect(order.status).toBe('blocked');
    expect(order.record.verified).toBe(false);
    expect(order.record.writeAllowed).toBe(false);
    expect(order.record.piiAllowed).toBe(false);
    expect(order.record.idempotencyKnown).toBe(false);
    expect(order.record.lostResponseRecoveryKnown).toBe(false);
    expect(order.blockers).toContain('canonical_order_create_endpoint_unconfirmed');
  });

  it('keeps BigBuy and Direct Supplier execution capabilities unverified or unavailable', () => {
    const contracts = listProviderExecutionContracts()
      .filter(contract => contract.provider === 'bigbuy' || contract.provider === 'direct_supplier');

    expect(contracts.length).toBeGreaterThan(0);
    expect(contracts.every(contract => contract.status === 'unverified' || contract.status === 'unavailable')).toBe(true);
    expect(contracts.every(contract => contract.record.verified === false)).toBe(true);
    expect(contracts.every(contract => contract.record.writeAllowed === false)).toBe(true);
    expect(contracts.every(contract => contract.record.piiAllowed === false)).toBe(true);
  });

  it('bridges into the generic registry without creating an external-write escape hatch', () => {
    const registry = createProviderExecutionCapabilityRegistry();

    const catalogue = registry.resolve({ provider: 'avasam', capability: 'catalog' });
    expect(catalogue.availability).toBe('available');
    expect(catalogue.readAllowed).toBe(true);
    expect(catalogue.externalMutationAllowed).toBe(false);
    expect(catalogue.piiDisclosureAllowed).toBe(false);

    const order = registry.resolve({ provider: 'avasam', capability: 'order_submission' });
    expect(order.availability).toBe('unavailable');
    expect(order.externalMutationAllowed).toBe(false);
    expect(order.piiDisclosureAllowed).toBe(false);

    const bigBuyOrder = registry.resolve({ provider: 'bigbuy', capability: 'order_submission' });
    expect(bigBuyOrder.availability).toBe('unavailable');
    expect(bigBuyOrder.externalMutationAllowed).toBe(false);
  });

  it('keeps reimbursement behind the separate financial firewall', () => {
    const reimbursement = getProviderExecutionContract('avasam', 'reimbursement');
    expect(reimbursement.impacts).toContain('financial');
    expect(reimbursement.status).toBe('blocked');
    expect(canPerformFinancialMutation()).toBe(false);
  });

  it('never grants write or PII permission in the current Lane G evidence state', () => {
    const contracts = listProviderExecutionContracts();
    expect(contracts.every(contract => contract.record.writeAllowed === false)).toBe(true);
    expect(contracts.every(contract => contract.record.piiAllowed === false)).toBe(true);
  });
});
