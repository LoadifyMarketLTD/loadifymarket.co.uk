import Stripe from 'stripe';
import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const MINIMUM_PAYOUT_PENCE = 2_500;

function utcWeekKey(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export const handler = schedule('0 8 * * 5', async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey || !stripeKey?.startsWith('sk_')) {
    console.error('seller-bank-payout: required Supabase/Stripe credentials are not configured');
    return { statusCode: 200 };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
  const { data: sellers, error } = await supabase
    .from('seller_profiles')
    .select('userId, stripeAccountId')
    .eq('stripeConnectStatus', 'active')
    .eq('sellerStatus', 'active')
    .eq('isPaused', false)
    .not('stripeAccountId', 'is', null);
  if (error) throw error;

  for (const seller of sellers ?? []) {
    const connectedAccountId = String(seller.stripeAccountId ?? '');
    if (!connectedAccountId.startsWith('acct_')) continue;
    try {
      const balance = await stripe.balance.retrieve({ stripeAccount: connectedAccountId });
      const availableGbp = balance.available.find((entry) => entry.currency === 'gbp')?.amount ?? 0;
      if (availableGbp < MINIMUM_PAYOUT_PENCE) continue;

      await stripe.payouts.create(
        {
          amount: availableGbp,
          currency: 'gbp',
          method: 'standard',
          metadata: {
            sellerId: String(seller.userId),
            policy: 'weekly_minimum_gbp_25',
          },
        },
        {
          stripeAccount: connectedAccountId,
          idempotencyKey: `seller-bank-payout:${connectedAccountId}:${utcWeekKey()}`,
        },
      );
    } catch (payoutError) {
      console.error(`seller-bank-payout: ${connectedAccountId} payout failed:`, payoutError);
    }
  }

  return { statusCode: 200 };
});
