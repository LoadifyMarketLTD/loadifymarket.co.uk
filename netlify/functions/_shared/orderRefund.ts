import type { SupabaseClient } from '@supabase/supabase-js';

export async function reconcileFullOrderRefund(
  supabase: SupabaseClient,
  orderId: string,
): Promise<void> {
  const { error } = await supabase.rpc('reconcile_full_order_refund', {
    p_order_id: orderId,
  });
  if (error) {
    throw new Error(`Full-refund database reconciliation failed: ${error.message}`);
  }
}
