import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { jsonResponse, optionsResponse } from "./_shared/http";
import { evaluateProjectionSupplierOffers } from "./_shared/supplierOfferSelectionRuntime";
import { evaluateSupplierCheckoutGuard } from "./_shared/supplierSync";

const METHODS = "POST, OPTIONS";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse(METHODS);
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Server configuration error" }, METHODS);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ["buyer"]);
  if (!auth.ok) return jsonResponse(auth.status, { error: "Unauthorized" }, METHODS);

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(event.body || "{}");
    if (!isRecord(parsed)) throw new Error("invalid body");
    body = parsed;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" }, METHODS);
  }

  const projectionId = typeof body.projectionId === "string" ? body.projectionId.trim() : "";
  const quantity = Number(body.quantity ?? 1);
  const requestedMarket = typeof body.marketCode === "string" ? body.marketCode.trim().toUpperCase() : "GB";
  const shippingAddress = isRecord(body.shippingAddress) ? body.shippingAddress : {};
  const billingAddress = isRecord(body.billingAddress) ? body.billingAddress : shippingAddress;
  const checkoutAttemptId = typeof body.checkoutAttemptId === "string" ? body.checkoutAttemptId.trim() : randomUUID();

  if (!UUID_RE.test(projectionId)) {
    return jsonResponse(400, { error: "A valid supplier catalog projection is required" }, METHODS);
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return jsonResponse(400, { error: "Supplier quantity must be between 1 and 100" }, METHODS);
  }
  if (!checkoutAttemptId || checkoutAttemptId.length > 120) {
    return jsonResponse(400, { error: "Invalid checkout attempt identity" }, METHODS);
  }
  if (requestedMarket !== "GB" && requestedMarket !== "RO") {
    return jsonResponse(400, { error: "Unsupported checkout market", code: "SUPPLIER_CHECKOUT_MARKET_INVALID" }, METHODS);
  }
  if (requestedMarket !== "GB") {
    return jsonResponse(409, {
      error: "Supplier checkout is not yet enabled for this market",
      code: "SUPPLIER_CHECKOUT_MARKET_NOT_READY",
      marketCode: requestedMarket,
      paymentSessionCreated: false,
    }, METHODS);
  }

  const selection = await evaluateProjectionSupplierOffers(admin, {
    projectionId,
    requestedQuantity: quantity,
    territory: requestedMarket,
  });
  const selectedOffer = selection.selected;
  if (!selection.eligible || !selectedOffer) {
    return jsonResponse(409, {
      error: "Supplier checkout is not currently available",
      selection,
      paymentSessionCreated: false,
    }, METHODS);
  }

  const checkoutGuard = await evaluateSupplierCheckoutGuard(admin, {
    supplierOfferId: selectedOffer.supplierOfferId,
    canonicalProductId: selectedOffer.canonicalProductId,
    commercialMode: "loadify_supplier_fulfilled",
    territory: selectedOffer.territory,
    externalVariantRef: selectedOffer.externalVariantRef,
  });

  if (!checkoutGuard.eligible) {
    return jsonResponse(409, {
      error: "Selected supplier offer is no longer available for checkout",
      selection,
      checkoutGuard,
      paymentSessionCreated: false,
    }, METHODS);
  }
  const correlationId = randomUUID();
  const reservationKey = `supplier-checkout:${auth.actor.id}:${projectionId}:${checkoutAttemptId}`;
  const orchestrationKey = `supplier-order:${auth.actor.id}:${projectionId}:${checkoutAttemptId}`;

  const { data, error } = await admin.rpc("server_prepare_supplier_checkout_selected_offer_v1", {
    p_buyer_id: auth.actor.id,
    p_projection_id: projectionId,
    p_supplier_offer_id: selectedOffer.supplierOfferId,
    p_quantity: quantity,
    p_shipping_address: shippingAddress,
    p_billing_address: billingAddress,
    p_reservation_key: reservationKey,
    p_orchestration_idempotency_key: orchestrationKey,
    p_correlation_id: correlationId,
  });

  if (error) {
    return jsonResponse(409, {
      error: error.message || "Unable to reserve supplier stock",
      paymentSessionCreated: false,
    }, METHODS);
  }

  return jsonResponse(200, {
    ok: true,
    checkout: data,
    selectedSupplierOfferId: selectedOffer.supplierOfferId,
    supplierSelectionReason: selection.reason,
    checkoutAttemptId,
    correlationId,
    paymentSessionCreated: false,
    paymentCaptured: false,
    supplierOrderSubmitted: false,
    nextGate: "loadify_merchant_of_record_payment_session",
  }, METHODS);
};
