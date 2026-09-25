import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ShippingMarketCode = 'GB' | 'RO';

export type ShippingMethodValidation =
  | { ok: true; ids: string[] }
  | { ok: false; status: 400 | 500; error: string };

/**
 * Treat shipping method ids as untrusted input. A listing may reference only
 * distinct, active platform shipping methods that exist at write time.
 */
export async function validateActiveShippingMethodIds(
  supabase: SupabaseClient,
  rawIds: unknown,
  marketCode: ShippingMarketCode = 'GB',
): Promise<ShippingMethodValidation> {
  if (!Array.isArray(rawIds)) {
    return { ok: false, status: 400, error: 'shippingMethodIds must be an array.' };
  }

  const ids = [...new Set(rawIds.map((value) => typeof value === 'string' ? value.trim() : ''))];
  if (ids.some((id) => !UUID_PATTERN.test(id))) {
    return { ok: false, status: 400, error: 'One or more shipping methods are invalid.' };
  }
  if (ids.length === 0) return { ok: true, ids };

  const { data, error } = await supabase
    .from('shipping_methods')
    .select('id')
    .in('id', ids)
    .eq('active', true)
    .contains('marketCodes', [marketCode]);

  if (error) {
    return { ok: false, status: 500, error: 'Unable to validate shipping methods.' };
  }

  const activeIds = new Set((data ?? []).map((row) => String(row.id)));
  if (ids.some((id) => !activeIds.has(id))) {
    return { ok: false, status: 400, error: 'One or more shipping methods are unavailable for the selected market.' };
  }

  return { ok: true, ids };
}
