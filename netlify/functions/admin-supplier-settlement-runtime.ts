import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { jsonResponse, optionsResponse } from "./_shared/http";

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
    const { data: result, error } = await admin.rpc("server_prepare_supplier_settlement_v1", {
      p_order_id: orderId,
    });
    if (error || !result || typeof result !== "object") {
      return jsonResponse(409, { error: "Supplier settlement could not be prepared", result: result ?? null }, METHODS);
    }
    return jsonResponse((result as { ok?: unknown }).ok === true ? 200 : 409, {
      ok: (result as { ok?: unknown }).ok === true,
      action,
      result,
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
