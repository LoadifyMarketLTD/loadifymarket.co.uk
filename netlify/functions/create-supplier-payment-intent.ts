import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { jsonResponse, optionsResponse } from "./_shared/http";

const METHODS = "POST, OPTIONS";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse(METHODS);
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!supabaseUrl || !serviceRoleKey || !stripeKey) {
    return jsonResponse(500, { error: "Server configuration error" }, METHODS);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin, ["buyer"]);
  if (!auth.ok) return jsonResponse(auth.status, { error: "Unauthorized" }, METHODS);

  let orderId = "";
  try {
    const body = JSON.parse(event.body || "{}") as { orderId?: unknown };
    orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" }, METHODS);
  }
  if (!UUID_RE.test(orderId)) return jsonResponse(400, { error: "A valid supplier order is required" }, METHODS);

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,buyerId,status,total,commercialMode,sellerId,canonicalProductId,supplierOfferId,pricingSnapshotId,supplierExternalVariantRefSnapshot,stripePaymentIntentId")
    .eq("id", orderId)
    .eq("buyerId", auth.actor.id)
    .maybeSingle();

  if (orderError || !order || order.status !== "awaiting_payment"
      || order.commercialMode !== "loadify_supplier_fulfilled"
      || order.sellerId !== null || !order.supplierOfferId || !order.pricingSnapshotId
      || !order.supplierExternalVariantRefSnapshot || order.stripePaymentIntentId) {
    return jsonResponse(409, { error: "Supplier order is not ready for payment" }, METHODS);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const { data: existingSession } = await admin
    .from("payment_sessions")
    .select("stripePaymentIntent,status")
    .eq("orderId", order.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existingSession?.stripePaymentIntent) {
    const existingIntent = await stripe.paymentIntents.retrieve(existingSession.stripePaymentIntent);
    if (existingIntent.status !== "canceled" && existingIntent.client_secret) {
      return jsonResponse(200, {
        clientSecret: existingIntent.client_secret,
        paymentIntentId: existingIntent.id,
        orderId: order.id,
        amountPence: existingIntent.amount,
        currency: "GBP",
        merchantOfRecord: "Loadify Market",
        externalCheckoutRedirect: false,
        reused: true,
      }, METHODS);
    }
  }

  const { data: guard, error: guardError } = await admin.rpc("server_supplier_stock_price_decision_v1", {
    p_supplier_offer_id: order.supplierOfferId,
    p_canonical_product_id: order.canonicalProductId,
    p_commercial_mode: "loadify_supplier_fulfilled",
    p_territory: "GB",
    p_external_variant_ref: order.supplierExternalVariantRefSnapshot,
  });
  if (guardError || !guard || guard.eligible !== true
      || guard.pricingSnapshotId !== order.pricingSnapshotId) {
    return jsonResponse(409, {
      error: "Supplier stock or price is no longer valid",
      guard,
      expectedPricingSnapshotId: order.pricingSnapshotId,
    }, METHODS);
  }

  const amountPence = Math.round(Number(order.total) * 100);
  if (!Number.isSafeInteger(amountPence) || amountPence <= 0) {
    return jsonResponse(409, { error: "Invalid canonical order total" }, METHODS);
  }

  const intent = await stripe.paymentIntents.create({
    amount: amountPence,
    currency: "gbp",
    automatic_payment_methods: { enabled: true },
    metadata: {
      commercialMode: "loadify_supplier_fulfilled",
      orderId: order.id,
      buyerId: auth.actor.id,
      supplierOfferId: order.supplierOfferId,
      pricingSnapshotId: order.pricingSnapshotId,
      supplierExternalVariantRef: order.supplierExternalVariantRefSnapshot,
    },
  }, { idempotencyKey: `supplier-payment:${order.id}` });

  const { error: insertError } = await admin.from("payment_sessions").insert({
    stripeSessionId: intent.id,
    stripePaymentIntent: intent.id,
    userId: auth.actor.id,
    orderId: order.id,
    status: "pending",
    amount: Number(order.total),
    currency: "GBP",
    metadata: {
      commercialMode: "loadify_supplier_fulfilled",
      orderId: order.id,
      totalPence: amountPence,
      supplierOfferId: order.supplierOfferId,
      pricingSnapshotId: order.pricingSnapshotId,
      supplierExternalVariantRef: order.supplierExternalVariantRefSnapshot,
    },
  });

  if (insertError) {
    await stripe.paymentIntents.cancel(intent.id).catch(() => undefined);
    return jsonResponse(500, { error: "Payment initialisation failed" }, METHODS);
  }

  return jsonResponse(200, {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    orderId: order.id,
    amountPence,
    currency: "GBP",
    merchantOfRecord: "Loadify Market",
    externalCheckoutRedirect: false,
  }, METHODS);
};
