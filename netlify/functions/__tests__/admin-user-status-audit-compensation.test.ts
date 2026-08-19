import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  applyAdminUserStatus,
  LONG_BAN_DURATION,
} from '../_shared/adminUserStatus';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const TARGET_ID = '22222222-2222-4222-8222-222222222222';

describe('applyAdminUserStatus reactivation audit compensation', () => {
  it('re-bans Auth and restores DB suspension when the privileged reactivation audit cannot persist', async () => {
    const updateUserById = vi.fn().mockResolvedValue({ data: {}, error: null });
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    const userUpdates: Array<Record<string, unknown>> = [];
    const sellerUpdates: Array<Record<string, unknown>> = [];
    const auditInsert = vi.fn().mockResolvedValue({ error: { message: 'audit unavailable' } });

    const from = vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: TARGET_ID, role: 'seller', isActive: false },
                error: null,
              }),
            }),
          }),
          update: vi.fn((payload: Record<string, unknown>) => {
            userUpdates.push(payload);
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          }),
        };
      }

      if (table === 'seller_profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  userId: TARGET_ID,
                  sellerStatus: 'suspended',
                  storeName: 'Seller Store',
                  businessName: null,
                  contactPhone: '+441234567890',
                  businessAddress: { postcode: 'BB1 1AA' },
                  stripeConnectStatus: 'active',
                  sellerType: 'individual',
                  companyRegistrationNumber: null,
                  vatNumber: null,
                  isVatRegistered: false,
                  requiresAdminApproval: false,
                  isApproved: true,
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn((payload: Record<string, unknown>) => {
            sellerUpdates.push(payload);
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          }),
        };
      }

      if (table === 'admin_actions') {
        return { insert: auditInsert };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const supabase = {
      auth: { admin: { updateUserById } },
      rpc,
      from,
    } as unknown as SupabaseClient;

    const result = await applyAdminUserStatus(
      supabase,
      ADMIN_ID,
      'reactivate',
      TARGET_ID,
    );

    expect(result).toEqual({
      ok: false,
      status: 500,
      body: {
        error: 'Account reactivation failed safely and remains blocked because audit persistence failed',
      },
    });
    expect(rpc).toHaveBeenCalledWith('is_active_user');
    expect(updateUserById).toHaveBeenNthCalledWith(1, TARGET_ID, { ban_duration: 'none' });
    expect(updateUserById).toHaveBeenNthCalledWith(2, TARGET_ID, { ban_duration: LONG_BAN_DURATION });
    expect(userUpdates).toEqual([{ isActive: true }, { isActive: false }]);
    expect(sellerUpdates).toEqual([
      { sellerStatus: 'active' },
      { sellerStatus: 'suspended' },
    ]);
    expect(auditInsert).toHaveBeenCalledOnce();
  });
});
