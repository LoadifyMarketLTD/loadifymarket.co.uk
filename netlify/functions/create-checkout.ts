import Stripe from 'stripe';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Supabase service-role client for server-side price lookups.
// Falls back gracefully when credentials are absent (e.g. local dev without .env).
const supabase =
  process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    : null;

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  title: string;
  sellerId: string;
}

interface CheckoutRequest {
  items: CartItem[];
  buyerId: string;
  guestEmail?: string;
  shippingAmount?: number;
  shippingMethod?: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    postal_code: string;
    country: string;
  };
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // ── Stripe key validation ──────────────────────────────────────────────────
  // Trim to remove accidental whitespace / newlines that are a common source of
  // "Invalid API Key" errors when the value is copy-pasted into Netlify's UI.
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) {
    console.error(
      'create-checkout: STRIPE_SECRET_KEY is missing or malformed. ' +
      'Set a valid key (starting with sk_live_ or sk_test_) in Netlify environment variables.'
    );
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Payment provider is not configured. Please contact support.' }),
    };
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-08-27.basil',
  });
  // ────────────────────────────────────────────────────────────────────────────

  try {
    const body: CheckoutRequest = JSON.parse(event.body || '{}');
    const { items, buyerId, guestEmail, shippingAddress, billingAddress, shippingAmount = 0, shippingMethod = 'Standard' } = body;

    // ── Fraud / Rate-limiting ────────────────────────────────────────────────
    // Allow at most 10 checkout attempts per IP (or userId) within a 15-minute
    // window. Limits are tracked in the checkout_rate_limits table (service role).
    // Authenticated buyers are keyed by userId; guests by the forwarded IP.
    // If neither is available the check is skipped — "unknown" callers are not
    // bucketed together because a single key would incorrectly aggregate all
    // unidentified traffic.
    if (supabase) {
      const RATE_LIMIT_MAX    = 10;
      const RATE_LIMIT_WINDOW = 15; // minutes
      const rawIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim()
                 || event.headers['client-ip'];
      const identifier = buyerId || rawIp;  // prefer userId; fall back to IP

      if (identifier) {
        const windowEnd = new Date(
          Math.ceil(Date.now() / (RATE_LIMIT_WINDOW * 60 * 1000)) * (RATE_LIMIT_WINDOW * 60 * 1000)
        ).toISOString();

        const { data: rl, error: rlSelectError } = await supabase
          .from('checkout_rate_limits')
          .select('id, attempts')
          .eq('identifier', identifier)
          .eq('windowEnd', windowEnd)
          .maybeSingle<{ id: string; attempts: number }>();

        if (!rlSelectError) {
          if (rl && rl.attempts >= RATE_LIMIT_MAX) {
            // Log suspicious activity via service-role client (bypasses RLS)
            await supabase.from('audit_logs').insert({
              action: 'rate_limit_exceeded',
              tableName: 'checkout_rate_limits',
              newData: { identifier, attempts: rl.attempts, windowEnd },
            });
            return {
              statusCode: 429,
              body: JSON.stringify({ error: 'Too many checkout attempts. Please try again later.' }),
            };
          }

          if (rl) {
            await supabase
              .from('checkout_rate_limits')
              .update({ attempts: rl.attempts + 1 })
              .eq('id', rl.id);
          } else {
            await supabase
              .from('checkout_rate_limits')
              .insert({ identifier, windowEnd, attempts: 1 });
          }
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── Server-side price validation ────────────────────────────────────────
    // Look up authoritative prices from the database so the client cannot
    // manipulate prices by sending crafted cart payloads.
    let validatedItems: CartItem[];

    if (supabase) {
      const productIds = items.map((i) => i.productId);
      const { data: dbProducts, error: dbError } = await supabase
        .from('products')
        .select('id, price, title, sellerId, isActive, isApproved, stockQuantity')
        .in('id', productIds);

      if (dbError) {
        console.error('Price lookup failed:', dbError.message);
        // Fall through to client prices rather than blocking the purchase,
        // but log the failure so it can be investigated.
        validatedItems = items;
      } else {
        const productMap = new Map(
          (dbProducts ?? []).map((p) => [p.id as string, p])
        );

        // Reject if any product is unavailable or not approved
        for (const item of items) {
          const dbProduct = productMap.get(item.productId);
          if (!dbProduct) {
            return {
              statusCode: 400,
              body: JSON.stringify({ error: `Product ${item.productId} not found` }),
            };
          }
          if (!dbProduct.isActive || !dbProduct.isApproved) {
            return {
              statusCode: 400,
              body: JSON.stringify({ error: `Product "${dbProduct.title}" is no longer available` }),
            };
          }
          if (typeof dbProduct.stockQuantity === 'number' && dbProduct.stockQuantity < item.quantity) {
            return {
              statusCode: 400,
              body: JSON.stringify({
                error: `Insufficient stock for "${dbProduct.title}". Available: ${dbProduct.stockQuantity}`,
              }),
            };
          }
        }

        // Replace client-supplied prices with DB prices
        validatedItems = items.map((item) => {
          const dbProduct = productMap.get(item.productId)!;
          return {
            ...item,
            price: dbProduct.price as number,
            title: (dbProduct.title as string) || item.title,
            sellerId: (dbProduct.sellerId as string) || item.sellerId,
          };
        });
      }
    } else {
      // No Supabase credentials — skip validation (development fallback only)
      console.warn('create-checkout: Supabase not configured, skipping server-side price validation');
      validatedItems = items;
    }
    // ────────────────────────────────────────────────────────────────────────

    // Calculate totals
    // Note: product prices from the DB are VAT-inclusive (displayed to buyers incl. VAT)
    const VAT_RATE = 0.20; // 20% UK VAT
    const COMMISSION_RATE = 0.07; // 7% marketplace commission

    // Cart totals (VAT-inclusive)
    const cartTotalIncVat = validatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartSubtotalExVat = cartTotalIncVat / (1 + VAT_RATE);
    const cartVatAmount = cartTotalIncVat - cartSubtotalExVat;

    // Shipping — shippingAmount is the ex-VAT shipping cost
    const shippingVAT = shippingAmount * VAT_RATE;
    const shippingIncVat = shippingAmount + shippingVAT;

    const total = cartTotalIncVat + shippingIncVat;
    const vatAmount = cartVatAmount + shippingVAT;
    const commissionAmount = cartSubtotalExVat * COMMISSION_RATE;

    // Create line items for Stripe (using validated server-side prices)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = validatedItems.map(item => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: item.title,
        },
        unit_amount: Math.round(item.price * 100), // Convert to pence
      },
      quantity: item.quantity,
    }));

    // Add shipping as a separate line item if applicable
    if (shippingAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `Shipping (${shippingMethod})`,
          },
          unit_amount: Math.round((shippingAmount + shippingVAT) * 100),
        },
        quantity: 1,
      });
    }

    const customerEmail = guestEmail || event.headers['user-email'] || undefined;

    // Generate a cryptographically unique transfer group ID for this checkout.
    // Stripe Connect "separate charges and transfers" requires all transfers
    // originating from one payment to share the same transfer_group so Stripe
    // can link payouts back to the originating charge in the Dashboard and
    // financial reports. The ID must be unique per checkout attempt.
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const transferGroup = `order-${buyerId || 'guest'}-${Date.now()}-${randomHex}`;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.URL || process.env.VITE_APP_URL}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL || process.env.VITE_APP_URL}/cart`,
      // Link all seller payouts for this checkout to the same payment via
      // transfer_group — required for Stripe Connect compliance.
      payment_intent_data: {
        transfer_group: transferGroup,
      },
      metadata: {
        buyerId: buyerId || '',
        subtotal: cartTotalIncVat.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        total: total.toFixed(2),
        shippingAmount: shippingAmount.toFixed(2),
        shippingMethod,
        shippingAddress: JSON.stringify(shippingAddress),
        billingAddress: JSON.stringify(billingAddress),
        items: JSON.stringify(validatedItems),
        transferGroup,
      },
      ...(customerEmail ? { customer_email: customerEmail } : {}),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
    };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      }),
    };
  }
};
