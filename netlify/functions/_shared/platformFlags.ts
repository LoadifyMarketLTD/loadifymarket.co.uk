/**
 * Centralised platform feature-flag reader.
 *
 * General marketplace callers may use the compatibility reader below, which
 * preserves the historical non-fatal defaults. Security/availability gates
 * such as public Buyer/Seller registration must instead use the strict reader
 * so an unavailable settings row can never silently reopen registration.
 *
 * Row layout in platform_settings
 * ┌────────────────────┬─────────────────────────────────────────────────────┐
 * │ key                │ value (JSONB)                                      │
 * ├────────────────────┼─────────────────────────────────────────────────────┤
 * │ feature_flags      │ { sellerRegistration, buyerRegistration, rfqSystem, │
 * │                    │   reviewSystem, autoApproveProducts,               │
 * │                    │   requireCompanyApproval }                         │
 * │ maintenance_mode   │ true | false                                      │
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
   * When true, newly registered company sellers are flagged as requiring an
   * explicit Loadify approval step. This flag is readiness policy, not proof
   * that Stripe alone can activate a seller.
   */
  requireCompanyApproval: boolean;
}

/** Historical compatibility defaults for non-critical callers. */
const FLAG_DEFAULTS: FeatureFlags = {
  sellerRegistration: true,
  buyerRegistration: true,
  rfqSystem: false,
  reviewSystem: true,
  autoApproveProducts: false,
  requireCompanyApproval: false,
};

function mergeFeatureFlags(value: unknown): FeatureFlags | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return { ...FLAG_DEFAULTS, ...(value as Partial<FeatureFlags>) };
}

/**
 * Compatibility reader for non-critical feature behavior.
 *
 * Non-fatal: returns historical defaults when the row cannot be read. Do NOT
 * use this function for registration/activation availability gates.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFeatureFlags(supabase: SupabaseClient<any>): Promise<FeatureFlags> {
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'feature_flags')
      .maybeSingle();
    return mergeFeatureFlags(data?.value) ?? { ...FLAG_DEFAULTS };
  } catch {
    return { ...FLAG_DEFAULTS };
  }
}

/**
 * Strict reader for security/availability-sensitive registration boundaries.
 *
 * Any query error, missing row, or malformed value rejects. Callers must fail
 * closed (normally 503) rather than assuming registration is enabled.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFeatureFlagsStrict(supabase: SupabaseClient<any>): Promise<FeatureFlags> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'feature_flags')
    .maybeSingle();

  if (error) {
    throw new Error(`feature_flags query failed: ${error.message}`);
  }

  const flags = mergeFeatureFlags(data?.value);
  if (!flags) {
    throw new Error('feature_flags row is missing or malformed');
  }

  return flags;
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
