import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

/**
 * escrow-release — scheduled Netlify function
 *
 * Runs daily and auto-releases escrow for service orders that:
 *   1. Have status = 'delivered' (= awaiting_confirmation)
 *   2. Have serviceCompletedAt set (provider declared job done)
 *   3. serviceCompletedAt is older than ESCROW_WINDOW_DAYS
 *   4. Have no open dispute
 *
 * On release:
 *   - status           → 'completed'
 *   - escrowStatus     → 'released'
 *   - escrowReleasedAt → NOW()
 *
 * Also sends an in-app notification to the seller.
 *
 * Schedule: daily at 02:00 UTC (off-peak)
 * Configured in netlify.toml:
 *   [functions."escrow-release"]
 *     schedule = "0 2 * * *"
 *
 * ⚠️  Requires env vars:
 *   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   ESCROW_WINDOW_DAYS (optional, default 7)
 */

const ESCROW_WINDOW_DAYS = Number(process.env.ESCROW_WINDOW_DAYS ?? 7);

export const handler = schedule('0 2 * * *', async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('escrow-release: DB credentials not set');
    return { statusCode: 200 };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const releaseBefore = new Date(
    Date.now() - ESCROW_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Find orders awaiting confirmation whose auto-release window has passed
  const { data: candidates, error: fetchError } = await supabase
    .from('orders')
    .select('id, orderNumber, sellerId, total')
    .eq('status', 'delivered')
    .eq('escrowStatus', 'held')
    .not('serviceCompletedAt', 'is', null)
    .lt('serviceCompletedAt', releaseBefore);

  if (fetchError) {
    console.error('escrow-release: candidate query failed:', fetchError.message);
    return { statusCode: 200 };
  }

  if (!candidates || candidates.length === 0) {
    console.log('escrow-release: no orders eligible for auto-release');
    return { statusCode: 200 };
  }

  console.log(`escrow-release: ${candidates.length} candidate(s) found`);

  const now = new Date().toISOString();

  for (const order of candidates as {
    id: string;
    orderNumber: string;
    sellerId: string;
    total: number;
  }[]) {
    // Check for open disputes before releasing
    const { data: openDispute } = await supabase
      .from('disputes')
      .select('id')
      .eq('orderId', order.id)
      .not('status', 'in', '("resolved","closed","rejected")')
      .maybeSingle();

    if (openDispute) {
      console.log(`escrow-release: order ${order.orderNumber} has open dispute — skipping`);
      continue;
    }

    // Release escrow and mark completed
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        escrowStatus: 'released',
        escrowReleasedAt: now,
      })
      .eq('id', order.id)
      .eq('status', 'delivered')       // optimistic lock: skip if already changed
      .eq('escrowStatus', 'held');

    if (updateError) {
      console.error(
        `escrow-release: failed to release order ${order.orderNumber}:`,
        updateError.message,
      );
      continue;
    }

    console.log(`escrow-release: order ${order.orderNumber} → completed, escrow released`);

    // Notify the seller (fire-and-forget — non-fatal)
    supabase
      .from('notifications')
      .insert({
        userId: order.sellerId,
        type: 'payment',
        title: 'Funds released',
        message: `Escrow for order ${order.orderNumber} has been auto-released. Funds of £${order.total.toFixed(2)} are now available.`,
        link: '/seller/orders',
      })
      .catch((err: unknown) =>
        console.warn('escrow-release: notification insert failed (non-fatal):', err),
      );
  }

  return { statusCode: 200 };
});
