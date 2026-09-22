import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { jsonResponse, optionsResponse } from "./_shared/http";
import { SUPPLIER_PROVIDER_KEYS, type SupplierProviderKey } from "./_shared/supplierProviderRegistry";
import { createRuntimeSupplierAdapter } from "./_shared/supplierAdapterRuntimeFactory";
import { recoverSupplierOrderAcknowledgement, submitPaidSupplierOrder } from "./_shared/supplierOrderHandshake";
import { syncSupplierTracking } from "./_shared/supplierTracking";

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
  } catch { return jsonResponse(400, { error: "Invalid JSON body" }, METHODS); }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!UUID_RE.test(orderId) || !["submit","recover","tracking"].includes(action)) {
    return jsonResponse(400, { error: "Valid orderId and runtime action are required" }, METHODS);
  }

  const { data: status, error: statusError } = await admin.rpc("server_admin_supplier_order_handshake_status_v1", {
    p_actor_id: auth.actor.id, p_order_id: orderId,
  });
  if (statusError || !status || typeof status !== "object") {
    return jsonResponse(409, { error: "Supplier order runtime status is unavailable" }, METHODS);
  }
  const items = Array.isArray((status as { items?: unknown }).items) ? (status as { items: Record<string, unknown>[] }).items : [];
  const current = items[0];
  if (!current) return jsonResponse(409, { error: "Supplier order handshake is not prepared" }, METHODS);

  const providerKey = String(current.providerKey ?? "");
  if (!isProviderKey(providerKey)) return jsonResponse(409, { error: "Supplier provider is not registered" }, METHODS);
  const supplierOfferId = String(current.supplierOfferId ?? "");
  if (!UUID_RE.test(supplierOfferId)) {
    return jsonResponse(409, { error: "Supplier offer context is unavailable" }, METHODS);
  }
  const adapter = await createRuntimeSupplierAdapter({
    client: admin,
    providerKey,
    supplierOfferId,
  });
  if (action === "tracking") {
    const result = await syncSupplierTracking(admin, adapter, String(current.handshakeId ?? ""));
    return jsonResponse(result.ok ? 200 : 409, { ok: result.ok, action, result }, METHODS);
  }

  const fulfilmentLegId = String(current.fulfilmentLegId ?? "");
  const idempotencyKey = `supplier-handshake:${orderId}`;
  const correlationId = randomUUID();
  const { data: prepared, error: preparedError } = await admin.rpc("server_prepare_supplier_order_handshake_v1", {
    p_order_id: orderId,
    p_fulfilment_leg_id: fulfilmentLegId,
    p_idempotency_key: idempotencyKey,
    p_correlation_id: correlationId,
  });
  if (preparedError || !prepared || typeof prepared !== "object" || (prepared as { eligible?: unknown }).eligible !== true) {
    return jsonResponse(409, { error: "Supplier order is not ready for runtime execution", prepared }, METHODS);
  }
  const context = prepared as Record<string, unknown>;

  if (action === "recover") {
    const supplierOrderRef = String(context.externalSupplierOrderRef ?? "");
    if (!supplierOrderRef) return jsonResponse(409, { error: "No supplier order reference is available for recovery" }, METHODS);
    const result = await recoverSupplierOrderAcknowledgement(admin, adapter, {
      handshakeId: String(context.handshakeId),
      supplierOrderRef,
      supplierKey: String(context.supplierKey),
      territory: String(context.destinationCountry || "GB"),
      correlationId: String(context.correlationId),
      idempotencyKey: String(context.idempotencyKey),
    });
    return jsonResponse(result.ok ? 200 : 409, { ok: result.ok, action, result }, METHODS);
  }

  const result = await submitPaidSupplierOrder(admin, adapter, {
    orderId,
    fulfilmentLegId,
    idempotencyKey: String(context.idempotencyKey),
    correlationId: String(context.correlationId),
  });
  return jsonResponse(result.ok ? 200 : 409, { ok: result.ok, action, result }, METHODS);
};
