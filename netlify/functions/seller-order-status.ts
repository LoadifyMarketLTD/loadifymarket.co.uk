import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { checkRateLimit } from './_shared/rateLimiter';
import { enforcePaymentBackedTransition } from './_shared/orderTransitionGuards';

type SellerStatusUpdate = 'packed' | 'shipped' | 'delivered';

interface RequestBody {
  orderId?: string;
  status?: SellerStatusUpdate;
}

interface OrderRow {
  id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  status: string;
  productId: string;
  stripePaymentIntentId?: string | null;
  rfqId?: string | null;
  rfqResponseId?: string | null;
}

interface ProductRow {
  id: string;
  listingContext: string | null;
}

const SELLER_ALLOWED_STATUSES = new Set<SellerStatusUpdate>(['packed', 'shipped', 'delivered']);

function isAllowedTransition(currentStatus: string, nextStatus: SellerStatusUpdate, listingContext: string | null): boolean {
  switch (nextStatus) {
    case 'packed':
      return currentStatus === 'paid';
    case 'shipped':
      return currentStatus === 'paid' || currentStatus === 'packed';
    case 'delivered':
      return listingContext === 'service' && (currentStatus === 'paid' || currentStatus === 'packed' || currentStatus === 'shipped');
    default:
      return false;
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await authenticateActiveAccount(event, supabase, ['seller', 'admin']);
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      body: JSON.stringify({ error: auth.status === 401 ? 'Authentication required' : 'Seller account required' }),
    };
  }

  const caller = auth.actor;

  const rl = await checkRateLimit({
    supabase,
    tableName: 'seller_order_status_rate_limits',
    identifier: caller.id,
    windowMinutes: 60,
    maxAttempts: 60,
  });
  if (rl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many order status updates. Please try again later.' }) };
  }

  let body: RequestBody;
  try {
    body = JSON.parse(event.body ?? '{}') as RequestBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { orderId, status } = body;
  if (!orderId || typeof orderId !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'orderId is required' }) };
  }
  if (!status || !SELLER_ALLOWED_STATUSES.has(status)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid seller order status' }) };
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, orderNumber, buyerId, sellerId, status, productId, stripePaymentIntentId, rfqId, rfqResponseId')
    .eq('id', orderId)
    .maybeSingle<OrderRow>();

  if (orderError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load order' }) };
  }
  if (!order) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
  }
  if (caller.role !== 'admin' && order.sellerId !== caller.id) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Not authorized for this order' }) };
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, listingContext')
    .eq('id', order.productId)
    .maybeSingle<ProductRow>();

  const listingContext = product?.listingContext ?? null;
  if (!isAllowedTransition(order.status, status, listingContext)) {
    return {
      statusCode: 409,
      body: JSON.stringify({ error: `Order cannot move from ${order.status} to ${status}` }),
    };
  }

  const paymentGuard = await enforcePaymentBackedTransition({
    supabase,
    order,
    product: {
      id: order.productId,
      listingContext,
    },
    nextStatus: status,
    actorRole: caller.role === 'admin' ? 'admin' : 'seller',
  });

  if (!paymentGuard.ok) {
    return {
      statusCode: paymentGuard.statusCode,
      body: JSON.stringify({ error: paymentGuard.error }),
    };
  }

  const updateData: Record<string, string> = { status };
  if (status === 'delivered' && listingContext === 'service') {
    updateData.serviceCompletedAt = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);

  if (updateError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update order status' }) };
  }

  if (status === 'packed' || status === 'shipped') {
    const notifMap: Record<'packed' | 'shipped', { title: string; message: string; link: string }> = {
      packed: {
        title: 'Your order is being packed',
        message: `Order ${order.orderNumber} is being packed and will be dispatched soon.`,
        link: '/buyer/orders',
      },
      shipped: {
        title: 'Your order is on its way!',
        message: `Order ${order.orderNumber} has been dispatched and is heading to you. Check your orders page to confirm delivery once it arrives.`,
        link: '/buyer/orders',
      },
    };
    const notif = notifMap[status];
    await supabase.from('notifications').insert({
      userId: order.buyerId,
      type: 'shipment',
      title: notif.title,
      message: notif.message,
      link: notif.link,
    });
  }

  if (status === 'delivered' && listingContext === 'service') {
    await supabase.from('notifications').insert({
      userId: order.buyerId,
      type: 'delivery',
      title: 'Job completed — please confirm',
      message: `${order.orderNumber}: your provider has marked this job as complete. Please confirm or open a dispute within 7 days.`,
      link: '/buyer/orders',
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      status,
      serviceCompletedAt: updateData.serviceCompletedAt ?? null,
    }),
  };
};
