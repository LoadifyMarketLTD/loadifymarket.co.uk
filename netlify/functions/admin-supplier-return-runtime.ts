import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { jsonResponse, optionsResponse } from "./_shared/http";
import { createSupplierProviderAdapter, SUPPLIER_PROVIDER_KEYS, type SupplierProviderKey } from "./_shared/supplierProviderRegistry";
import { pollSupplierRecovery, requestSupplierReturn } from "./_shared/supplierReturns";

const METHODS = "POST, OPTIONS";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isProviderKey = (value: string): value is SupplierProviderKey =>
  (SUPPLIER_PROVIDER_KEYS as readonly string[]).includes(value);

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

  const returnId = typeof body.returnId === "string" ? body.returnId.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!UUID_RE.test(returnId) || !["request","poll_recovery"].includes(action)) {
    return jsonResponse(400, { error: "Valid returnId and supplier return action are required" }, METHODS);
  }

  const { data: platformReturn, error: returnError } = await admin
    .from("returns")
    .select("id,orderId,status,reason,commercialMode,requestedQuantity,supplierReturnCaseId")
    .eq("id", returnId)
    .maybeSingle();

  if (returnError || !platformReturn || platformReturn.commercialMode !== "loadify_supplier_fulfilled") {
    return jsonResponse(404, { error: "Supplier-fulfilled return not found" }, METHODS);
  }

  const { data: handshakeStatus, error: handshakeError } = await admin.rpc("server_admin_supplier_order_handshake_status_v1", {
    p_actor_id: auth.actor.id,
    p_order_id: platformReturn.orderId,
  });
  const items = !handshakeError && handshakeStatus && typeof handshakeStatus === "object"
    && Array.isArray((handshakeStatus as { items?: unknown }).items)
    ? (handshakeStatus as { items: Record<string, unknown>[] }).items
    : [];
  const current = items[0];
  if (!current) return jsonResponse(409, { error: "Supplier order handshake is unavailable for this return" }, METHODS);

  const providerKey = String(current.providerKey ?? "");
  if (!isProviderKey(providerKey)) return jsonResponse(409, { error: "Supplier provider is not registered" }, METHODS);
  const adapter = createSupplierProviderAdapter(providerKey);

  if (action === "poll_recovery") {
    const returnCaseId = String(platformReturn.supplierReturnCaseId ?? "");
    if (!UUID_RE.test(returnCaseId)) {
      return jsonResponse(409, { error: "Supplier return case is not linked yet" }, METHODS);
    }
    const result = await pollSupplierRecovery(admin, adapter, returnCaseId);
    return jsonResponse(result.ok ? 200 : 409, { ok: result.ok, action, result }, METHODS);
  }

  const fulfilmentLegId = String(current.fulfilmentLegId ?? "");
  const quantity = Number(platformReturn.requestedQuantity ?? 0);
  if (!UUID_RE.test(fulfilmentLegId) || !Number.isSafeInteger(quantity) || quantity < 1) {
    return jsonResponse(409, { error: "Supplier return context is incomplete" }, METHODS);
  }

  const result = await requestSupplierReturn(admin, adapter, {
    orderId: String(platformReturn.orderId),
    fulfilmentLegId,
    reasonCode: String(platformReturn.reason ?? "other"),
    quantity,
    idempotencyKey: `supplier-return:${returnId}`,
    correlationId: randomUUID(),
  });

  if (result.returnCaseId) {
    const update: Record<string, unknown> = { supplierReturnCaseId: result.returnCaseId };
    if (result.ok && result.state === "authorised") update.status = "approved";
    await admin.from("returns").update(update).eq("id", returnId);
  }

  return jsonResponse(result.ok ? 200 : 409, {
    ok: result.ok,
    action,
    result,
    buyerRefundIssued: false,
  }, METHODS);
};
