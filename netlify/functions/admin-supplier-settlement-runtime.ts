import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { jsonResponse, optionsResponse } from "./_shared/http";
import { retrieveStripeProcessingFee } from "./_shared/stripeSettlement";

const METHODS = "POST, OPTIONS";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse(METHODS);
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" }, METHODS);

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonResponse(500, { error: "Server configuration error" }, METHODS);

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin, ["admin"]);
  if (!auth.ok) return jsonResponse(auth.status, { error: "Unauthorized" }, METHODS);

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(event.body || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" }, METHODS);
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!UUID_RE.test(orderId) || !["prepare","record_manual_paid"].includes(action)) {
    return jsonResponse(400, { error: "Valid orderId and settlement action are required" }, METHODS);
  }

  if (action === "prepare") {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || !stripeKey.startsWith("sk_")) {
      return jsonResponse(500, { error: "Stripe server configuration is unavailable" }, METHODS);
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("stripePaymentIntentId,total,currency,commercialMode")
      .eq("id", orderId)
      .maybeSingle<{
        stripePaymentIntentId: string | null;
        total: number;
        currency: string;
        commercialMode: string | null;
      }>();
    if (orderError || !order || order.commercialMode !== "loadify_supplier_fulfilled" || !order.stripePaymentIntentId) {
      return jsonResponse(409, { error: "Supplier payment evidence is unavailable" }, METHODS);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return jsonResponse(409, { error: "Supplier payment has not succeeded" }, METHODS);
    }
    const chargeId = typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id ?? null;
    if (!chargeId) {
      return jsonResponse(409, { error: "Stripe charge evidence is unavailable" }, METHODS);
    }

    const fee = await retrieveStripeProcessingFee(stripe, chargeId);
    const { data: feeResult, error: feeError } = await admin.rpc("server_record_supplier_processor_fee_v1", {
      p_order_id: orderId,
      p_payment_intent_ref: order.stripePaymentIntentId,
      p_charge_ref: fee.chargeId,
      p_balance_transaction_ref: fee.balanceTransactionId,
      p_gross_amount: fee.grossPence / 100,
      p_processor_fee_amount: fee.processingFeePence / 100,
      p_net_amount: fee.netPence / 100,
      p_currency: fee.currency.toUpperCase(),
      p_occurred_at: new Date().toISOString(),
      p_evidence: { source: "stripe_balance_transaction" },
    });
    if (feeError || !feeResult || (feeResult as { ok?: unknown }).ok !== true) {
      return jsonResponse(409, { error: "Stripe processor-fee evidence could not be recorded", result: feeResult ?? null }, METHODS);
    }

    const { data: costResult, error: costError } = await admin.rpc("server_materialize_supplier_cost_ledger_v1", {
      p_order_id: orderId,
    });
    if (costError || !costResult || (costResult as { ok?: unknown }).ok !== true) {
      return jsonResponse(409, { error: "Supplier cost ledger could not be materialised", result: costResult ?? null }, METHODS);
    }

    const { data: result, error } = await admin.rpc("server_prepare_supplier_settlement_v1", {
      p_order_id: orderId,
    });
    if (error || !result || typeof result !== "object") {
      return jsonResponse(409, { error: "Supplier settlement could not be prepared", result: result ?? null }, METHODS);
    }

    const { data: financialTruth, error: truthError } = await admin.rpc("server_supplier_order_financial_truth_v1", {
      p_order_id: orderId,
    });
    if (truthError || !financialTruth || (financialTruth as { ready?: unknown }).ready !== true) {
      return jsonResponse(409, { error: "Supplier financial truth is incomplete", result: financialTruth ?? null }, METHODS);
    }

    return jsonResponse((result as { ok?: unknown }).ok === true ? 200 : 409, {
      ok: (result as { ok?: unknown }).ok === true,
      action,
      result,
      financialTruth,
    }, METHODS);
  }

  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
  const externalPaymentRef = typeof body.externalPaymentRef === "string" ? body.externalPaymentRef.trim() : "";
  const evidence = body.evidence && typeof body.evidence === "object" && !Array.isArray(body.evidence)
    ? body.evidence
    : null;
  if (!Number.isFinite(amount) || amount <= 0 || !externalPaymentRef || !evidence) {
    return jsonResponse(400, { error: "Manual settlement requires exact amount, external payment reference and evidence" }, METHODS);
  }

  const { data: result, error } = await admin.rpc("server_record_manual_supplier_settlement_v1", {
    p_actor_id: auth.actor.id,
    p_order_id: orderId,
    p_amount: amount,
    p_external_payment_ref: externalPaymentRef,
    p_evidence: evidence,
  });
  if (error || !result || typeof result !== "object") {
    return jsonResponse(409, { error: "Manual supplier settlement could not be recorded", result: result ?? null }, METHODS);
  }
  return jsonResponse((result as { ok?: unknown }).ok === true ? 200 : 409, {
    ok: (result as { ok?: unknown }).ok === true,
    action,
    result,
  }, METHODS);
};
