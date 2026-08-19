import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { tryAutoActivateSeller } from '../_shared/sellerActivation';

const completeProfile = {
  userId: 'seller-1',
  sellerStatus: 'submitted',
  activatedAt: null,
  storeName: 'Seller Store',
  businessName: 'Seller Ltd',
  contactPhone: '07123456789',
  businessAddress: { postcode: 'BB1 1AA' },
  stripeAccountId: 'acct_123',
  stripeConnectStatus: 'active',
  sellerType: 'individual',
  companyRegistrationNumber: null,
  vatNumber: null,
  isVatRegistered: false,
  requiresAdminApproval: false,
  isApproved: true,
};

function client(options: {
  account?: { role: string; isActive: boolean } | null;
  accountError?: { message: string } | null;
  profile?: typeof completeProfile;
}) {
  const profile = options.profile ?? completeProfile;
  const sellerUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const sellerUpdate = vi.fn(() => ({ eq: sellerUpdateEq }));

  const from = vi.fn((table: string) => {
    if (table === 'seller_profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: profile, error: null }),
          }),
        }),
        update: sellerUpdate,
      };
    }

    if (table === 'users') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: options.account ?? null,
              error: options.accountError ?? null,
            }),
          }),
        }),
      };
    }

    throw new Error(`unexpected table ${table}`);
  });

  return {
    api: { from } as unknown as SupabaseClient,
    sellerUpdate,
    sellerUpdateEq,
  };
}

describe('tryAutoActivateSeller active-account gate', () => {
  it('fails closed for an inactive live seller account and never promotes the profile', async () => {
    const c = client({ account: { role: 'seller', isActive: false } });

    const result = await tryAutoActivateSeller(c.api, 'seller-1', 'active');

    expect(result).toMatchObject({
      sellerStatus: 'suspended',
      changed: false,
      firstActivation: false,
      stripeActive: true,
    });
    expect(c.sellerUpdate).not.toHaveBeenCalled();
  });

  it('fails closed when the live account lookup cannot be trusted', async () => {
    const c = client({ accountError: { message: 'db unavailable' } });

    const result = await tryAutoActivateSeller(c.api, 'seller-1', 'active');

    expect(result?.sellerStatus).toBe('suspended');
    expect(result?.firstActivation).toBe(false);
    expect(c.sellerUpdate).not.toHaveBeenCalled();
  });

  it('allows an active live seller to transition from submitted to active', async () => {
    const c = client({ account: { role: 'seller', isActive: true } });

    const result = await tryAutoActivateSeller(c.api, 'seller-1', 'active');

    expect(result).toMatchObject({
      sellerStatus: 'active',
      changed: true,
      firstActivation: true,
      profileComplete: true,
      stripeConnected: true,
      stripeActive: true,
    });
    expect(c.sellerUpdate).toHaveBeenCalledWith({ sellerStatus: 'active' });
    expect(c.sellerUpdateEq).toHaveBeenCalledWith('userId', 'seller-1');
  });
});
