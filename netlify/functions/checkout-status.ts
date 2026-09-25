import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'GET, OPTIONS';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const sessionId = String(event.queryStringParameters?.session_id || '').trim();
  if (!sessionId.startsWith('cs_') || sessionId.length < 20) {
    return jsonResponse(400, { error: 'Invalid checkout session reference' }, METHODS);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey?.startsWith('sk_')) {
    return jsonResponse(500, { error: 'Server configuration error' }, METHODS);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });
    const checkout = await stripe.checkout.sessions.retrieve(sessionId);

    const { data: paymentSession, error: paymentError } = await admin
      .from('payment_sessions')
      .select('status, orderId, amount, currency')
      .eq('stripeSessionId', sessionId)
      .maybeSingle<{ status: string; orderId: string | null; amount: number | null; currency: string | null }>();

    if (paymentError) throw paymentError;

    let orderNumber: string | null = null;
    let orderStatus: string | null = null;
    if (paymentSession?.orderId) {
      const { data: order, error: orderError } = await admin
        .from('orders')
        .select('orderNumber, status')
        .eq('id', paymentSession.orderId)
        .maybeSingle<{ orderNumber: string | null; status: string | null }>();
      if (orderError) throw orderError;
      orderNumber = order?.orderNumber ?? null;
      orderStatus = order?.status ?? null;
    }

    const confirmed = paymentSession?.status === 'completed' && Boolean(paymentSession.orderId);
    return jsonResponse(200, {
      found: Boolean(paymentSession),
      confirmed,
      paymentStatus: paymentSession?.status ?? null,
      stripePaymentStatus: checkout.payment_status,
      stripeStatus: checkout.status,
      orderId: paymentSession?.orderId ?? null,
      orderNumber,
      orderStatus,
      amount: paymentSession?.amount ?? null,
      currency: paymentSession?.currency ?? null,
    }, METHODS);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('checkout-status:', message);
    if (message.toLowerCase().includes('no such checkout.session')) {
      return jsonResponse(404, { error: 'Checkout session not found' }, METHODS);
    }
    return jsonResponse(500, { error: 'Unable to verify checkout status' }, METHODS);
  }
};
