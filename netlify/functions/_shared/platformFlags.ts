/**
 * Centralised platform feature-flag reader.
 *
 * All serverless functions should call these helpers instead of querying
 * platform_settings directly.  The helpers are intentionally non-fatal:
 * if the DB is unreachable they fall back to safe defaults so a transient
 * read error never blocks legitimate traffic.
 *
 * Row layout in platform_settings
 * ┌────────────────────┬─────────────────────────────────────────────────────┐
 * │ key                │ value (JSONB)                                        │
 * ├────────────────────┼─────────────────────────────────────────────────────┤
 * │ feature_flags      │ { sellerRegistration, buyerRegistration, rfqSystem, │
 * │                    │   reviewSystem, autoApproveProducts,                 │
 * │                    │   requireCompanyApproval }                           │
 * │ maintenance_mode   │ true | false                                        │
 * └────────────────────┴─────────────────────────────────────────────────────┘
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface FeatureFlags {
  sellerRegistration: boolean;
  buyerRegistration: boolean;
  rfqSystem: boolean;
  reviewSystem: boolean;
  autoApproveProducts: boolean;
  /**
   * When true, newly registered company sellers (sellerType='company') are
   * flagged with requiresAdminApproval=true and cannot auto-activate via
   * Stripe alone — admin must explicitly approve them.
   * Default: false (all sellers auto-activate as today).
   */
  requireCompanyApproval: boolean;
}

/** Safe defaults — everything enabled except auto-approve and company gate. */
const FLAG_DEFAULTS: FeatureFlags = {
  sellerRegistration: true,
  buyerRegistration: true,
  rfqSystem: true,
  reviewSystem: true,
  autoApproveProducts: false,
  requireCompanyApproval: false,
};

/**
 * Reads the feature_flags row from platform_settings and merges it with
 * FLAG_DEFAULTS so callers always receive a fully-typed object.
 *
 * Non-fatal: returns FLAG_DEFAULTS on any DB error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFeatureFlags(supabase: SupabaseClient<any>): Promise<FeatureFlags> {
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'feature_flags')
      .maybeSingle();
    if (data?.value && typeof data.value === 'object') {
      return { ...FLAG_DEFAULTS, ...(data.value as Partial<FeatureFlags>) };
    }
  } catch {
    // Non-fatal — fall through to defaults.
  }
  return { ...FLAG_DEFAULTS };
}

/**
 * Returns true when maintenance_mode is enabled in platform_settings.
 *
 * Non-fatal: returns false (platform open) on any DB error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function isMaintenanceMode(supabase: SupabaseClient<any>): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle();
    if (data?.value === true || data?.value === 'true') return true;
  } catch {
    // Non-fatal — fall through.
  }
  return false;
}
