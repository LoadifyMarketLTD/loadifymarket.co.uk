import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPPLIER_ONBOARDING_PROFILE_VERSION = 1 as const;

export type SupplierOnboardingSourceClass =
  | 'direct_supplier'
  | 'supplier_aggregator'
  | 'wholesale_feed';

export type SupplierOnboardingStatus =
  | 'draft'
  | 'qualification'
  | 'ready_for_review'
  | 'approved'
  | 'blocked';

export interface SupplierOnboardingProfileInput {
  supplierId: string;
  sourceClass: SupplierOnboardingSourceClass;
  feedTransport: 'json_api' | 'json_feed' | 'csv' | 'xml' | 'sftp' | 'manual_catalog';
  configRef?: string;
  supportedTerritories: string[];
  requestedCapabilities: string[];
  commercialTermsRef?: string;
  currency?: string;
  paymentTermsDays?: number;
  minimumOrderValue?: number;
  dispatchSlaHours?: number;
  returnWindowDays?: number;
  catalogRefreshMinutes?: number;
  stockRefreshMinutes?: number;
  priceRefreshMinutes?: number;
  onboardingStatus: SupplierOnboardingStatus;
  reviewReason?: string;
}

export async function mutateSupplierOnboardingProfile(
  admin: Pick<SupabaseClient, 'rpc'>,
  actorId: string,
  action: 'get' | 'upsert',
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const { data, error } = await admin.rpc('server_admin_supplier_onboarding_v1', {
      p_actor_id: actorId,
      p_action: action,
      p_payload: payload,
    });
    if (error) {
      return { ok: false, error: error.message || 'Supplier onboarding profile mutation failed' };
    }
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Supplier onboarding profile mutation failed',
    };
  }
}
