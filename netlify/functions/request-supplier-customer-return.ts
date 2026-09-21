import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { evaluateCustomerReturnAutomation } from "./_shared/customerReturnAutomation";
import { jsonResponse, optionsResponse } from "./_shared/http";

const METHODS = "POST, OPTIONS";
const RETURN_REASONS = new Set(["damaged", "wrong_item", "not_as_described", "changed_mind", "other"]);

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse(METHODS);
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" }, METHODS);

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonResponse(500, { error: "Server configuration error" }, METHODS);

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin, ["buyer"]);
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
  const reasonCode = typeof body.reasonCode === "string" ? body.reasonCode.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!orderId || !RETURN_REASONS.has(reasonCode) || description.length < 3 || description.length > 2000) {
    return jsonResponse(400, { error: "Valid orderId, return reason and description are required" }, METHODS);
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,buyerId,status,commercialMode,deliveredAt")
    .eq("id", orderId)
    .eq("buyerId", auth.actor.id)
    .maybeSingle();

  if (orderError || !order || order.commercialMode !== "loadify_supplier_fulfilled") {
    return jsonResponse(404, { error: "Supplier-fulfilled order not found" }, METHODS);
  }

  const { data: existing } = await admin
    .from("returns")
    .select("id,status")
    .eq("orderId", order.id)
    .neq("status", "rejected")
    .maybeSingle();
  if (existing) {
    return jsonResponse(409, { error: "A return request is already open for this order", returnId: existing.id }, METHODS);
  }

  const { data: item, error: itemError } = await admin
    .from("order_items")
    .select("id,quantity")
    .eq("orderId", order.id)
    .limit(1)
    .maybeSingle();
  if (itemError || !item?.id || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
    return jsonResponse(409, { error: "Canonical order item is unavailable" }, METHODS);
  }

  const eligibility = evaluateCustomerReturnAutomation({
    orderStatus: String(order.status),
    deliveredAt: order.deliveredAt ? String(order.deliveredAt) : null,
    purchasedQuantity: Number(item.quantity),
    requestedQuantity: Number(item.quantity),
    reasonCode,
    supplierReturnCapability: false,
    carrierLabelCapability: false,
  });

  if (eligibility.decision === "ineligible") {
    return jsonResponse(409, { error: eligibility.reason, eligibility }, METHODS);
  }

  const { data: created, error: createError } = await admin
    .from("returns")
    .insert({
      orderId: order.id,
      buyerId: auth.actor.id,
      sellerId: null,
      commercialMode: "loadify_supplier_fulfilled",
      requestedQuantity: Number(item.quantity),
      reason: reasonCode,
      description,
      status: "requested",
    })
    .select("id,orderId,status,buyerCarrier,buyerTrackingNumber,refundAmount,createdAt")
    .single();

  if (createError || !created) {
    return jsonResponse(409, { error: createError?.message || "Return request could not be created" }, METHODS);
  }

  await admin.from("notifications").insert({
    userId: auth.actor.id,
    type: "order",
    title: "Return requested",
    message: "Your return request has been recorded. Loadify will confirm the return route before any refund is issued.",
    isRead: false,
    link: "/buyer/orders",
  }).catch(() => undefined);

  return jsonResponse(200, {
    ok: true,
    return: created,
    eligibility,
    refundIssued: false,
    supplierRecoveryStarted: false,
    manualReviewRequired: eligibility.decision === "manual_review",
  }, METHODS);
};
