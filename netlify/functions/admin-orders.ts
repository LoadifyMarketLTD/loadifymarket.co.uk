import { Handler, HandlerEvent } from '@netlify/functions';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  assessAdminReleaseEligibility,
  enforcePaymentBackedTransition,
  loadCompletedPaymentEvidence,
  summarizePaymentEvidence,
} from './_shared/orderTransitionGuards';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthOk {
  ok: true;
  caller: { id: string; email: string; role: string };
}
interface AuthFail {
  ok: false;
  status: number;
}
type AuthResult = AuthOk | AuthFail;

interface OrderListRow {
  id: string;
  orderNumber: string | null;
  total: number | null;
  status: string | null;
  createdAt: string | null;
  buyerId: string;
  productId: string;
  stripePaymentIntentId?: string | null;
  rfqId?: string | null;
  rfqResponseId?: string | null;
  escrowStatus?: string | null;
}

interface ProductMetaRow {
  id: string;
  title?: string | null;
  listingContext?: 'product' | 'service' | null;
  listingStatus?: string | null;
  reservedUntil?: string | null;
}

interface PaymentSessionMetaRow {
  orderId: string;
  status: string;
  stripePaymentIntent: string | null;
}

// ── Auth helper ────────────────────────────────────────────────────────────────

async function authenticateAdmin(event: HandlerEvent, admin: SupabaseClient): Promise<AuthResult> {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401 };
  }

  const token = authHeader.substring(7).trim();
  const { data, error } = await admin.auth.getUser(token);

  if (error || !data?.user) {
    return { ok: false, status: 401 };
  }

  const authUser = data.user;
  const authEmail = (authUser.email || '').toLowerCase().trim();

  if (!authEmail) {
    return { ok: false, status: 401 };
  }

  const jwtRole = (authUser.app_metadata as Record<string, unknown> | undefined)?.role;
  if (jwtRole === 'admin') {
    return { ok: true, caller: { id: authUser.id, email: authEmail, role: 'admin' } };
  }

  const { data: dbUser, error: dbError } = await admin
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .maybeSingle();

  if (dbError || !dbUser || dbUser.role !== 'admin') {
    return { ok: false, status: 403 };
  }

  return { ok: true, caller: { id: authUser.id, email: authEmail, role: dbUser.role } };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Valid order statuses ──────────────────────────────────────────────────────
// Must match the status values used throughout the platform. Any value not
// in this set is rejected before hitting the database so that admin tooling
// cannot silently set arbitrary, platform-breaking status strings.
const VALID_ORDER_STATUSES = new Set([
  'pending',
  'paid',
  'packed',
  'shipped',
  'delivered',
  'completed',
  'disputed',
  'refunded',
  'cancelled',
]);
const BLOCKING_LISTING_STATUSES = ['awaiting_payment', 'paid', 'packed', 'shipped', 'delivered', 'completed'];

// ── Handler ───────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  // Support both SUPABASE_URL (Netlify dashboard convention) and the VITE_
  // prefixed variant that build tooling also exports to the environment.
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Server config error' }),
    };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await authenticateAdmin(event, admin);

  if (!auth.ok) {
    return {
      statusCode: auth.status,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  try {
    // ── GET — list all orders ─────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const { data: rows, error: ordersErr } = await admin
        .from('orders')
        .select('id, orderNumber, total, status, createdAt, buyerId, productId, stripePaymentIntentId, rfqId, rfqResponseId, escrowStatus')
        .order('createdAt', { ascending: false })
        .limit(100);

      if (ordersErr) throw ordersErr;

      const orderRows = (rows || []) as OrderListRow[];

      // Resolve buyer names from users table
      const buyerIds = [...new Set(orderRows.map((o: { buyerId: string | null }) => o.buyerId).filter((id): id is string => !!id))];
      const buyerNames: Record<string, string> = {};

      if (buyerIds.length > 0) {
        const { data: buyers } = await admin
          .from('users')
          .select('id, firstName, lastName')
          .in('id', buyerIds);
        (buyers ?? []).forEach((b: { id: string; firstName?: string | null; lastName?: string | null }) => {
          const name = [b.firstName, b.lastName].filter((n): n is string => !!n).join(' ').trim();
          buyerNames[b.id] = name || 'Customer';
        });
      }

      // Resolve product titles in a separate query (avoids FK hint issues with camelCase columns)
      const productIds = [...new Set(orderRows.map((o: { productId: string | null }) => o.productId).filter((id): id is string => !!id))];
      const productTitles: Record<string, string> = {};
      const productMeta = new Map<string, ProductMetaRow>();

      if (productIds.length > 0) {
        const { data: products } = await admin
          .from('products')
          .select('id, title, listingContext, listingStatus, reservedUntil')
          .in('id', productIds);
        (products ?? []).forEach((p: ProductMetaRow) => {
          productTitles[p.id] = p.title || '—';
          productMeta.set(p.id, p);
        });
      }

      const orderIds = orderRows.map((o) => o.id);
      const completedPayments = new Map<string, PaymentSessionMetaRow>();
      if (orderIds.length > 0) {
        const { data: paymentSessions } = await admin
          .from('payment_sessions')
          .select('orderId, status, stripePaymentIntent')
          .in('orderId', orderIds)
          .eq('status', 'completed');

        (paymentSessions ?? []).forEach((session: PaymentSessionMetaRow) => {
          if (!completedPayments.has(session.orderId)) {
            completedPayments.set(session.orderId, session);
          }
        });
      }

      const orders = orderRows.map((o) => {
        const product = productMeta.get(o.productId);
        const paymentEvidence = summarizePaymentEvidence({
          order: {
            stripePaymentIntentId: o.stripePaymentIntentId ?? null,
            rfqId: o.rfqId ?? null,
            rfqResponseId: o.rfqResponseId ?? null,
          },
          listingContext: product?.listingContext ?? null,
          paymentSession: completedPayments.get(o.id) ?? null,
        });
        const releaseEligibility = assessAdminReleaseEligibility({
          order: {
            status: o.status ?? 'pending',
            escrowStatus: o.escrowStatus ?? null,
          },
          paymentEvidence,
        });

        return {
          id: o.id,
          orderNumber: o.orderNumber || o.id.slice(0, 8).toUpperCase(),
          buyer: buyerNames[o.buyerId] ?? (o.buyerId ? o.buyerId.slice(0, 8).toUpperCase() : '—'),
          product: productTitles[o.productId] ?? '—',
          total: o.total ?? 0,
          status: o.status ?? 'paid',
          date: formatDate(o.createdAt),
          listingContext: product?.listingContext ?? null,
          hasValidPaymentEvidence: paymentEvidence.hasValidPaymentEvidence,
          paymentEvidenceSource: paymentEvidence.paymentEvidenceSource,
          allowedNonStripeFlow: paymentEvidence.allowedNonStripeFlow,
          releaseEligible: releaseEligibility.eligible,
          releaseEligibilityReason: releaseEligibility.reason,
        };
      });

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({ orders }),
      };
    }

    // ── POST — update order status ────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(event.body || '{}') as Record<string, unknown>;
      } catch {
        return {
          statusCode: 400,
          headers: JSON_HEADERS,
          body: JSON.stringify({ error: 'Invalid request body' }),
        };
      }

      const op = body.op as string | undefined;
      const orderId = body.orderId as string | undefined;
      const status = body.status as string | undefined;
      const allowUnpaidTransition = body.allowUnpaidTransition === true;
      const overrideReason = typeof body.overrideReason === 'string' ? body.overrideReason.trim() : '';
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

      if (op === 'update_status') {
        if (!orderId || !status) {
          return {
            statusCode: 400,
            headers: JSON_HEADERS,
            body: JSON.stringify({ error: 'orderId and status required' }),
          };
        }

        if (!VALID_ORDER_STATUSES.has(status)) {
          return {
            statusCode: 400,
            headers: JSON_HEADERS,
            body: JSON.stringify({
              error: `Invalid status value. Allowed values: ${[...VALID_ORDER_STATUSES].join(', ')}`,
            }),
          };
        }

        const { data: order, error: orderErr } = await admin
          .from('orders')
          .select('id, orderNumber, status, productId, stripePaymentIntentId, rfqId, rfqResponseId, escrowStatus')
          .eq('id', orderId)
          .maybeSingle();

        if (orderErr || !order) {
          return {
            statusCode: 404,
            headers: JSON_HEADERS,
            body: JSON.stringify({ error: 'Order not found' }),
          };
        }

        // Cancellation and refund are financial lifecycle operations, not
        // cosmetic status changes. Keep them on their dedicated, audited paths:
        // - unpaid/test orders -> release_unpaid_lock
        // - paid orders -> create-refund (Stripe + transfer reconciliation)
        if (status === 'cancelled') {
          return {
            statusCode: 409,
            headers: JSON_HEADERS,
            body: JSON.stringify({
              error: 'Orders cannot be cancelled by changing status directly. For unpaid/test orders use the safe lock-release action; for paid orders issue a Stripe refund.',
            }),
          };
        }
        if (status === 'refunded') {
          return {
            statusCode: 409,
            headers: JSON_HEADERS,
            body: JSON.stringify({
              error: 'Orders cannot be marked refunded manually. Use the Stripe refund action so the payment and seller transfer are reconciled.',
            }),
          };
        }

        if (status === 'packed' || status === 'shipped' || status === 'delivered') {
          const { data: product } = await admin
            .from('products')
            .select('id, listingContext')
            .eq('id', order.productId)
            .maybeSingle();

          const paymentGuard = await enforcePaymentBackedTransition({
            supabase: admin,
            order,
            product: {
              id: order.productId,
              listingContext: product?.listingContext ?? null,
            },
            nextStatus: status,
            actorRole: 'admin',
            allowAdminUnpaidOverride: allowUnpaidTransition,
            adminOverrideReason: overrideReason,
          });

          if (!paymentGuard.ok) {
            return {
              statusCode: paymentGuard.statusCode,
              headers: JSON_HEADERS,
              body: JSON.stringify({ error: paymentGuard.error }),
            };
          }
        }

        const { error: updateErr } = await admin
          .from('orders')
          .update({ status })
          .eq('id', orderId);

        if (updateErr) throw updateErr;

        if (
          allowUnpaidTransition &&
          overrideReason &&
          (status === 'packed' || status === 'shipped' || status === 'delivered')
        ) {
          await admin.from('order_events').insert({
            orderId,
            actorId: auth.caller.id,
            event: 'admin_unpaid_transition_override',
            metadata: {
              reason: overrideReason,
              previousStatus: order.status,
              nextStatus: status,
            },
          });
        }

        return {
          statusCode: 200,
          headers: JSON_HEADERS,
          body: JSON.stringify({ success: true }),
        };
      }

      if (op === 'release_unpaid_lock') {
        if (!orderId || !reason) {
          return {
            statusCode: 400,
            headers: JSON_HEADERS,
            body: JSON.stringify({ error: 'orderId and reason required' }),
          };
        }

        const { data: order, error: orderErr } = await admin
          .from('orders')
          .select('id, orderNumber, status, productId, stripePaymentIntentId, rfqId, rfqResponseId, escrowStatus')
          .eq('id', orderId)
          .maybeSingle();

        if (orderErr || !order) {
          return {
            statusCode: 404,
            headers: JSON_HEADERS,
            body: JSON.stringify({ error: 'Order not found' }),
          };
        }

        const { data: product } = await admin
          .from('products')
          .select('id, listingContext, listingStatus, reservedUntil')
          .eq('id', order.productId)
          .maybeSingle<ProductMetaRow>();

        const paymentSession = await loadCompletedPaymentEvidence(admin, order.id);
        const paymentEvidence = summarizePaymentEvidence({
          order,
          listingContext: product?.listingContext ?? null,
          paymentSession,
        });
        const releaseEligibility = assessAdminReleaseEligibility({
          order,
          paymentEvidence,
        });

        if (!releaseEligibility.eligible) {
          return {
            statusCode: 409,
            headers: JSON_HEADERS,
            body: JSON.stringify({ error: releaseEligibility.reason }),
          };
        }

        const previousStatus = order.status;
        if (order.status !== 'cancelled' || order.escrowStatus !== 'released') {
          const { error: cancelErr } = await admin
            .from('orders')
            .update({ status: 'cancelled', escrowStatus: 'released' })
            .eq('id', orderId);

          if (cancelErr) throw cancelErr;
        }

        let listingUnlocked = false;
        if (product?.id) {
          const { data: remainingLocks, error: remainingLocksErr } = await admin
            .from('orders')
            .select('id')
            .eq('productId', product.id)
            .in('status', BLOCKING_LISTING_STATUSES);

          if (remainingLocksErr) throw remainingLocksErr;

          if ((remainingLocks ?? []).length === 0 && (product.listingStatus === 'reserved' || product.listingStatus === 'sold' || product.reservedUntil)) {
            const { error: productErr } = await admin
              .from('products')
              .update({ listingStatus: 'active', reservedUntil: null })
              .eq('id', product.id);

            if (productErr) throw productErr;
            listingUnlocked = true;
          }
        }

        await admin.from('order_events').insert({
          orderId,
          actorId: auth.caller.id,
          event: 'admin_unpaid_lock_release',
          metadata: {
            reason,
            previousStatus,
            nextStatus: 'cancelled',
            listingUnlocked,
          },
        });

        return {
          statusCode: 200,
          headers: JSON_HEADERS,
          body: JSON.stringify({ success: true, status: 'cancelled', listingUnlocked }),
        };
      }

      return {
        statusCode: 400,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: `Unknown op: ${op ?? '(none)'}` }),
      };
    }

    return {
      statusCode: 405,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('ADMIN ORDERS ERROR:', message, err);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
