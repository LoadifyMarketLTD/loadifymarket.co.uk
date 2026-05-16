/**
 * rfq — unified RFQ operations handler
 *
 * Enforces feature_flags.rfqSystem at the backend for every RFQ action.
 * All write paths are blocked when rfqSystem = false.
 *
 * Operations (op field in body):
 *
 *  "create"   — Buyer submits a new RFQ request
 *               Required: product_name, quantity, destination_country,
 *                         estimated_budget, buyer_email
 *               Optional: unit, message, categoryId, buyerId
 *
 *  "respond"  — Seller records a response to an RFQ
 *               Required: rfqId, quotedPrice, message
 *               Optional: leadTimeDays, currency
 *               (Writes to rfq_responses and optionally opens email client)
 *
 *  "accept"   — Buyer accepts a seller quote
 *               Required: rfqId, responseId
 *               Creates an order/job from the accepted quote.
 *               Marks rfq_requests.status = 'closed'
 *               Marks rfq_responses.status = 'accepted'
 *
 * HTTP 403 is returned for all ops when rfqSystem = false (admin bypass).
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getFeatureFlags, isMaintenanceMode } from './_shared/platformFlags';
import { checkRateLimit } from './_shared/rateLimiter';

const RFQ_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidRfqEmail(value: unknown): boolean {
  return typeof value === 'string' && RFQ_EMAIL_RE.test(value.trim()) && value.trim().length <= 254;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { op } = body as { op?: string };
  if (!op || !['create', 'respond', 'accept', 'withdraw'].includes(op)) {
    return { statusCode: 400, body: JSON.stringify({ error: '"op" must be one of: create, respond, accept, withdraw' }) };
  }

  // ── Auth (required for respond and accept; optional for create) ──────────
  const authHeader = event.headers['authorization'] || '';
  let callerId: string | null = null;
  let userRole: string | null = null;

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data: authData } = await supabase.auth.getUser(token);
    if (authData?.user) {
      callerId = authData.user.id;
      const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('id', callerId)
        .maybeSingle<{ role: string | null }>();
      userRole = userRow?.role ?? null;
    }
  }

  const isAdmin = userRole === 'admin';

  // ── RFQ system flag (Step 5.4) ────────────────────────────────────────────
  const flags = await getFeatureFlags(supabase);
  if (!flags.rfqSystem && !isAdmin) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'RFQ system is currently disabled' }),
    };
  }

  // ── Maintenance mode guard ────────────────────────────────────────────────
  const maintenance = await isMaintenanceMode(supabase);
  if (maintenance && !isAdmin) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Platform is temporarily under maintenance' }),
    };
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  // Use authenticated user ID when available; fall back to IP for anonymous
  // RFQ submissions so unauthenticated spam is also caught.
  const rlIdentifier =
    callerId ??
    (event.headers['x-nf-client-connection-ip'] ??
      event.headers['client-ip'] ??
      'anonymous');
  const rfqRl = await checkRateLimit({
    supabase,
    tableName: 'rfq_rate_limits',
    identifier: rlIdentifier,
    windowMinutes: 60,
    maxAttempts: 20,
  });
  if (rfqRl.exceeded && !isAdmin) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Too many RFQ submissions. Please wait and try again later.' }),
    };
  }

  // ── Route to operation ────────────────────────────────────────────────────

  // ── create ────────────────────────────────────────────────────────────────
  if (op === 'create') {
    const {
      product_name,
      quantity,
      destination_country,
      estimated_budget,
      buyer_email,
      unit,
      message,
      categoryId,
      currency,
    } = body as {
      product_name?: string;
      quantity?: string;
      destination_country?: string;
      estimated_budget?: string;
      buyer_email?: string;
      unit?: string;
      message?: string;
      categoryId?: string;
      currency?: string;
    };

    if (!product_name || !quantity || !destination_country || !estimated_budget || !buyer_email) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'product_name, quantity, destination_country, estimated_budget, and buyer_email are required',
        }),
      };
    }

    if (!isValidRfqEmail(buyer_email)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid buyer_email address' }) };
    }
    if (product_name.trim().length > 300) {
      return { statusCode: 400, body: JSON.stringify({ error: 'product_name must be 300 characters or fewer' }) };
    }
    if (quantity.trim().length > 100) {
      return { statusCode: 400, body: JSON.stringify({ error: 'quantity must be 100 characters or fewer' }) };
    }
    if (destination_country.trim().length > 100) {
      return { statusCode: 400, body: JSON.stringify({ error: 'destination_country must be 100 characters or fewer' }) };
    }
    if (estimated_budget.trim().length > 100) {
      return { statusCode: 400, body: JSON.stringify({ error: 'estimated_budget must be 100 characters or fewer' }) };
    }
    if (unit && unit.trim().length > 50) {
      return { statusCode: 400, body: JSON.stringify({ error: 'unit must be 50 characters or fewer' }) };
    }
    if (message && message.trim().length > 5000) {
      return { statusCode: 400, body: JSON.stringify({ error: 'message must be 5000 characters or fewer' }) };
    }

    const rfqRow: Record<string, unknown> = {
      product_name,
      quantity,
      destination_country,
      estimated_budget,
      buyer_email,
      currency: currency || 'GBP',
      status: 'pending',
    };
    if (unit) rfqRow.unit = unit;
    if (message) rfqRow.message = message;
    if (categoryId) rfqRow.categoryId = categoryId;
    if (callerId) rfqRow.buyerId = callerId;

    const { data: rfq, error: rfqError } = await supabase
      .from('rfq_requests')
      .insert([rfqRow])
      .select('id')
      .single();

    if (rfqError) {
      console.error('rfq/create error:', rfqError.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to submit RFQ. Please try again.' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ id: rfq.id }) };
  }

  // ── respond ───────────────────────────────────────────────────────────────
  if (op === 'respond') {
    if (!callerId || userRole !== 'seller' && !isAdmin) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Seller authentication required' }) };
    }

    const { rfqId, quotedPrice, message: responseMessage, leadTimeDays, currency } = body as {
      rfqId?: string;
      quotedPrice?: number;
      message?: string;
      leadTimeDays?: number;
      currency?: string;
    };

    if (!rfqId || typeof quotedPrice !== 'number' || !responseMessage) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'rfqId, quotedPrice (number), and message are required' }),
      };
    }

    if (!Number.isFinite(quotedPrice) || quotedPrice <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'quotedPrice must be a positive number' }) };
    }
    if (responseMessage.trim().length > 5000) {
      return { statusCode: 400, body: JSON.stringify({ error: 'message must be 5000 characters or fewer' }) };
    }

    // Verify the RFQ exists
    const { data: rfq } = await supabase
      .from('rfq_requests')
      .select('id, status')
      .eq('id', rfqId)
      .maybeSingle<{ id: string; status: string }>();

    if (!rfq) {
      return { statusCode: 404, body: JSON.stringify({ error: 'RFQ not found' }) };
    }
    if (rfq.status === 'closed' || rfq.status === 'expired') {
      return { statusCode: 409, body: JSON.stringify({ error: 'This RFQ is no longer accepting responses' }) };
    }

    const responseRow: Record<string, unknown> = {
      rfqId,
      sellerId: callerId,
      quotedPrice,
      message: responseMessage,
      currency: currency || 'GBP',
      status: 'submitted',
    };
    if (typeof leadTimeDays === 'number') responseRow.leadTimeDays = leadTimeDays;

    const { data: response, error: responseError } = await supabase
      .from('rfq_responses')
      .upsert([responseRow], { onConflict: 'rfqId,sellerId' })
      .select('id')
      .single();

    if (responseError) {
      console.error('rfq/respond error:', responseError.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to record response. Please try again.' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ id: response.id }) };
  }

  // ── accept ────────────────────────────────────────────────────────────────
  if (op === 'accept') {
    if (!callerId) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
    }

    const { rfqId, responseId } = body as { rfqId?: string; responseId?: string };
    if (!rfqId || !responseId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'rfqId and responseId are required' }) };
    }

    // Fetch the RFQ (caller must be the buyer)
    const { data: rfq } = await supabase
      .from('rfq_requests')
      .select('id, buyerId, buyer_email, product_name, status')
      .eq('id', rfqId)
      .maybeSingle<{
        id: string;
        buyerId: string | null;
        buyer_email: string;
        product_name: string;
        status: string;
      }>();

    if (!rfq) {
      return { statusCode: 404, body: JSON.stringify({ error: 'RFQ not found' }) };
    }

    // Allow: the buyer who created the RFQ (or admin)
    const isBuyer = rfq.buyerId === callerId;
    if (!isBuyer && !isAdmin) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Only the buyer who submitted this RFQ can accept a quote' }) };
    }

    if (rfq.status === 'closed') {
      return { statusCode: 409, body: JSON.stringify({ error: 'This RFQ has already been fulfilled' }) };
    }

    // Fetch the accepted response
    const { data: response } = await supabase
      .from('rfq_responses')
      .select('id, sellerId, quotedPrice, currency, status')
      .eq('id', responseId)
      .eq('rfqId', rfqId)
      .maybeSingle<{
        id: string;
        sellerId: string;
        quotedPrice: number;
        currency: string;
        status: string;
      }>();

    if (!response) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Quote not found' }) };
    }

    // Create an order/job from the accepted quote.
    // Status 'paid' is the service-doctrine equivalent of "accepted" per migration 448
    // (paid → accepted in service lifecycle semantics).
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          buyerId: rfq.buyerId ?? callerId,
          sellerId: response.sellerId,
          status: 'paid',
          escrowStatus: 'held',
          // Financial amounts from the accepted quote
          subtotal: response.quotedPrice,
          vatAmount: 0,
          shippingAmount: 0,
          discountAmount: 0,
          total: response.quotedPrice,
          commission: 0,
          // RFQ linkage (requires migration 452_rfq_orders_linkage.sql)
          rfqId,
          rfqResponseId: responseId,
          // Service orders have no shipping
          shippingAddress: {},
          billingAddress: {},
          deliveryMethod: 'delivery',
        },
      ])
      .select('id')
      .single();

    if (orderError) {
      console.error('rfq/accept: order creation error:', orderError.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create job from quote. Please try again.' }) };
    }

    // Mark RFQ as closed and the accepted response as accepted; reject others
    await Promise.all([
      supabase.from('rfq_requests').update({ status: 'closed' }).eq('id', rfqId),
      supabase.from('rfq_responses').update({ status: 'accepted', acceptedAt: new Date().toISOString() }).eq('id', responseId),
      supabase
        .from('rfq_responses')
        .update({ status: 'rejected' })
        .eq('rfqId', rfqId)
        .neq('id', responseId)
        .eq('status', 'submitted'),
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ orderId: order.id }),
    };
  }

  // ── withdraw ──────────────────────────────────────────────────────────────
  if (op === 'withdraw') {
    if (!callerId || (userRole !== 'seller' && !isAdmin)) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Seller authentication required' }) };
    }

    const { responseId } = body as { responseId?: string };
    if (!responseId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'responseId is required' }) };
    }

    // Fetch the response — seller can only withdraw their own quote
    const { data: existingResponse } = await supabase
      .from('rfq_responses')
      .select('id, sellerId, status')
      .eq('id', responseId)
      .maybeSingle<{ id: string; sellerId: string; status: string }>();

    if (!existingResponse) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Quote not found' }) };
    }

    if (!isAdmin && existingResponse.sellerId !== callerId) {
      return { statusCode: 403, body: JSON.stringify({ error: 'You can only withdraw your own quotes' }) };
    }

    if (existingResponse.status !== 'submitted') {
      return { statusCode: 409, body: JSON.stringify({ error: 'Only submitted (unaccepted) quotes can be withdrawn' }) };
    }

    const { error: withdrawError } = await supabase
      .from('rfq_responses')
      .update({ status: 'withdrawn' })
      .eq('id', responseId);

    if (withdrawError) {
      console.error('rfq/withdraw error:', withdrawError.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to withdraw quote. Please try again.' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'Unknown operation' }) };
};
