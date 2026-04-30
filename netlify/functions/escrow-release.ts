import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from './_shared/pushNotifications';

/**
 * escrow-release — scheduled Netlify function
 *
 * Runs daily and auto-releases escrow for orders that:
 *
 * SERVICE ORDERS:
 *   1. Have status = 'delivered' (= awaiting_confirmation)
 *   2. Have serviceCompletedAt set (provider declared job done)
 *   3. serviceCompletedAt is older than ESCROW_WINDOW_DAYS
 *   4. Have no open dispute
 *
 * PHYSICAL GOODS ORDERS:
 *   1. Have status = 'delivered'
 *   2. serviceCompletedAt IS NULL (not a service order)
 *   3. deliveredAt is set and older than ESCROW_WINDOW_DAYS
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

const ESCROW_WINDOW_DAYS = (() => {
  const parsed = Number(process.env.ESCROW_WINDOW_DAYS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
})();

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

  // ── Query 1: Service orders ────────────────────────────────────────────────
  // Service orders require explicit provider completion (serviceCompletedAt set)
  // before auto-release so the seller has explicitly declared the job done.
  const { data: serviceOrders, error: serviceError } = await supabase
    .from('orders')
    .select('id, orderNumber, sellerId, total')
    .eq('status', 'delivered')
    .eq('escrowStatus', 'held')
    .not('serviceCompletedAt', 'is', null)
    .lt('serviceCompletedAt', releaseBefore);

  if (serviceError) {
    console.error('escrow-release: service order query failed:', serviceError.message);
  }

  // ── Query 2: Physical goods orders ────────────────────────────────────────
  // Physical goods use deliveredAt as the release trigger.  serviceCompletedAt
  // must be NULL so service orders are not accidentally included here.
  const { data: physicalOrders, error: physicalError } = await supabase
    .from('orders')
    .select('id, orderNumber, sellerId, total')
    .eq('status', 'delivered')
    .eq('escrowStatus', 'held')
    .is('serviceCompletedAt', null)
    .not('deliveredAt', 'is', null)
    .lt('deliveredAt', releaseBefore);

  if (physicalError) {
    console.error('escrow-release: physical goods order query failed:', physicalError.message);
  }

  const candidates = [
    ...((serviceOrders ?? []) as { id: string; orderNumber: string; sellerId: string; total: number }[]),
    ...((physicalOrders ?? []) as { id: string; orderNumber: string; sellerId: string; total: number }[]),
  ];

  if (serviceError && physicalError) {
    // Both queries failed — bail out
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

    // Push notification to seller's mobile device (non-fatal)
    sendPushToUser(supabase, order.sellerId, {
      title: 'Funds released 💰',
      body: `Escrow for order ${order.orderNumber} released. £${order.total.toFixed(2)} now available.`,
      data: { type: 'escrow_released', orderId: order.id },
    }).catch((err: unknown) =>
      console.warn('escrow-release: push notification failed (non-fatal):', err),
    );
  }

  return { statusCode: 200 };
});
