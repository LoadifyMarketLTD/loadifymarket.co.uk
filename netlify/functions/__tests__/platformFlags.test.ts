import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getFeatureFlagsStrict } from '../_shared/platformFlags';

function makeClient(result: { data: { value: unknown } | null; error: { message: string } | null }): SupabaseClient {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as SupabaseClient;
}

describe('getFeatureFlagsStrict', () => {
  it('accepts explicit boolean registration gates and fills optional defaults', async () => {
    const flags = await getFeatureFlagsStrict(makeClient({
      data: {
        value: {
          sellerRegistration: false,
          buyerRegistration: true,
          autoApproveProducts: true,
        },
      },
      error: null,
    }));

    expect(flags).toEqual({
      sellerRegistration: false,
      buyerRegistration: true,
      rfqSystem: false,
      reviewSystem: true,
      autoApproveProducts: true,
      requireCompanyApproval: false,
    });
  });

  it('rejects a missing registration gate instead of defaulting it open', async () => {
    await expect(getFeatureFlagsStrict(makeClient({
      data: { value: { buyerRegistration: true } },
      error: null,
    }))).rejects.toThrow(/missing or malformed/i);
  });

  it('rejects non-boolean registration values instead of treating strings as enabled', async () => {
    await expect(getFeatureFlagsStrict(makeClient({
      data: {
        value: {
          sellerRegistration: 'false',
          buyerRegistration: true,
        },
      },
      error: null,
    }))).rejects.toThrow(/missing or malformed/i);
  });

  it('rejects malformed known optional flags so downstream Boolean coercion cannot invert policy', async () => {
    await expect(getFeatureFlagsStrict(makeClient({
      data: {
        value: {
          sellerRegistration: true,
          buyerRegistration: true,
          requireCompanyApproval: 'false',
        },
      },
      error: null,
    }))).rejects.toThrow(/missing or malformed/i);
  });

  it('rejects database read errors', async () => {
    await expect(getFeatureFlagsStrict(makeClient({
      data: null,
      error: { message: 'settings unavailable' },
    }))).rejects.toThrow(/query failed/i);
  });
});
