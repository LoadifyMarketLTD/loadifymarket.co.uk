/**
 * conversation-get-or-create
 *
 * Resolves an existing marketplace conversation or creates it when missing.
 *
 * Listing flow body: { productId: string, sellerId: string }
 * Transaction flow body: { orderId: string }
 * Returns: { conversationId: string, created: boolean }
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';

interface RequestBody {
  productId?: string;
  sellerId?: string;
  orderId?: string;
}

interface ConversationRow {
  id: string;
}

interface ProductRow {
  id: string;
  title: string;
  sellerId: string;
  isActive?: boolean;
}

interface OrderRow {
  id: string;
  buyerId: string | null;
  sellerId: string | null;
  productId: string | null;
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

  const auth = await authenticateActiveAccount(event, supabase);
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      body: JSON.stringify({ error: auth.status === 401 ? 'Authentication required' : 'Account is suspended' }),
    };
  }
  const callerId = auth.actor.id;

  let body: RequestBody;
  try {
    body = JSON.parse(event.body ?? '{}') as RequestBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  let productId: string;
  let otherUserId: string;
  let expectedSellerId: string;
  let requireActiveListing = true;

  if (body.orderId) {
    if (typeof body.orderId !== 'string') {
      return { statusCode: 400, body: JSON.stringify({ error: 'orderId must be a string' }) };
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, buyerId, sellerId, productId')
      .eq('id', body.orderId)
      .maybeSingle<OrderRow>();

    if (orderError || !order) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
    }

    const callerIsBuyer = order.buyerId === callerId;
    const callerIsSeller = order.sellerId === callerId;
    if (!callerIsBuyer && !callerIsSeller) {
      return { statusCode: 403, body: JSON.stringify({ error: 'You do not have access to this order' }) };
    }

    if (!order.productId || !order.buyerId || !order.sellerId) {
      return { statusCode: 409, body: JSON.stringify({ error: 'Order messaging information is incomplete' }) };
    }

    productId = order.productId;
    expectedSellerId = order.sellerId;
    otherUserId = callerIsBuyer ? order.sellerId : order.buyerId;
    requireActiveListing = false;
  } else {
    const { productId: requestedProductId, sellerId } = body;
    if (!requestedProductId || typeof requestedProductId !== 'string') {
      return { statusCode: 400, body: JSON.stringify({ error: 'productId is required' }) };
    }
    if (!sellerId || typeof sellerId !== 'string') {
      return { statusCode: 400, body: JSON.stringify({ error: 'sellerId is required' }) };
    }
    if (callerId === sellerId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'You cannot message your own listing' }) };
    }

    productId = requestedProductId;
    expectedSellerId = sellerId;
    otherUserId = sellerId;
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, title, sellerId, isActive')
    .eq('id', productId)
    .maybeSingle<ProductRow>();

  if (productError || !product) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Listing not found' }) };
  }

  if (product.sellerId !== expectedSellerId) {
    return { statusCode: 409, body: JSON.stringify({ error: 'Listing seller mismatch' }) };
  }

  if (requireActiveListing && product.isActive === false) {
    return { statusCode: 409, body: JSON.stringify({ error: 'This listing is no longer active' }) };
  }

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('productId', productId)
    .or(
      `and(user1Id.eq.${callerId},user2Id.eq.${otherUserId}),` +
      `and(user1Id.eq.${otherUserId},user2Id.eq.${callerId})`
    )
    .maybeSingle<ConversationRow>();

  if (existing?.id) {
    return {
      statusCode: 200,
      body: JSON.stringify({ conversationId: existing.id, created: false }),
    };
  }

  const { data: created, error: createError } = await supabase
    .from('conversations')
    .insert({
      user1Id: callerId,
      user2Id: otherUserId,
      productId,
      subject: product.title ? `Re: ${product.title}` : null,
    })
    .select('id')
    .single<ConversationRow>();

  if (createError) {
    if (createError.code === '23505') {
      const { data: raceWinner } = await supabase
        .from('conversations')
        .select('id')
        .eq('productId', productId)
        .or(
          `and(user1Id.eq.${callerId},user2Id.eq.${otherUserId}),` +
          `and(user1Id.eq.${otherUserId},user2Id.eq.${callerId})`
        )
        .maybeSingle<ConversationRow>();

      if (raceWinner?.id) {
        return {
          statusCode: 200,
          body: JSON.stringify({ conversationId: raceWinner.id, created: false }),
        };
      }
    }

    console.error('conversation-get-or-create: insert failed:', createError.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create conversation' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ conversationId: created.id, created: true }),
  };
};
