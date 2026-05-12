/**
 * conversation-get-or-create
 *
 * Resolves an existing conversation between the caller (buyer) and seller for a
 * listing, or creates it when missing.
 *
 * Body: { productId: string, sellerId: string }
 * Returns: { conversationId: string, created: boolean }
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

interface RequestBody {
  productId?: string;
  sellerId?: string;
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
    auth: { persistSession: false },
  });

  const authHeader = event.headers.authorization ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  const token = authHeader.slice(7);
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid authentication token' }) };
  }

  let body: RequestBody;
  try {
    body = JSON.parse(event.body ?? '{}') as RequestBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { productId, sellerId } = body;
  if (!productId || typeof productId !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'productId is required' }) };
  }
  if (!sellerId || typeof sellerId !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'sellerId is required' }) };
  }
  if (authUser.id === sellerId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'You cannot message your own listing' }) };
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, title, sellerId, isActive')
    .eq('id', productId)
    .maybeSingle<ProductRow>();

  if (productError || !product) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Listing not found' }) };
  }
  if (product.sellerId !== sellerId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Seller does not match listing seller' }) };
  }
  if (product.isActive === false) {
    return { statusCode: 409, body: JSON.stringify({ error: 'This listing is no longer active' }) };
  }

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('productId', productId)
    .or(
      `and(user1Id.eq.${authUser.id},user2Id.eq.${sellerId}),` +
      `and(user1Id.eq.${sellerId},user2Id.eq.${authUser.id})`
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
      user1Id: authUser.id,
      user2Id: sellerId,
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
          `and(user1Id.eq.${authUser.id},user2Id.eq.${sellerId}),` +
          `and(user1Id.eq.${sellerId},user2Id.eq.${authUser.id})`
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

