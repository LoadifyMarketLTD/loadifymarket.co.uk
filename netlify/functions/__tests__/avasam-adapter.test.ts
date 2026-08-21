import { describe, expect, it } from 'vitest';
import { AvasamAdapterV1 } from '../_shared/avasamAdapter';
import { assertSupplierAdapterV1 } from '../_shared/supplierAdapter';

describe('AvasamAdapterV1 foundation', () => {
  it('conforms to SupplierAdapterV1 and exposes no unverified capabilities', () => {
    const adapter = new AvasamAdapterV1({});
    assertSupplierAdapterV1(adapter);
    expect(adapter.providerKey).toBe('avasam');
    expect(adapter.interfaceVersion).toBe(1);
    expect(adapter.capabilities).toEqual([]);
  });

  it('fails closed instead of inventing undocumented provider behavior', async () => {
    const adapter = new AvasamAdapterV1({});
    const result = await adapter.getStock?.({
      correlationId: 'test-correlation',
      idempotencyKey: 'test-idempotency',
      supplierKey: 'test-supplier',
      territory: 'GB',
    }, ['variant-1']);
    expect(result?.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
  });
});
