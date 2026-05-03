import { useEffect, useRef, useState } from 'react';
import MainLayout from "@/layouts/MainLayout";
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ShoppingBag, ArrowRight, Package, Shield, Truck, Star, Loader2, Clock } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { BRAND } from '../constants/brand';
import { supabase } from '../lib/supabase';
import { trackOfferPaid } from '../lib/analytics';

// Maximum number of 2-second polls before giving up and showing the safe timeout message.
const MAX_POLLS = 15; // 30 seconds total
const POLL_INTERVAL_MS = 2000;

type PagePhase =
  | 'polling'    // Actively polling — show "Confirming payment…" spinner
  | 'confirmed'  // Webhook completed — show normal success page
  | 'timeout'    // Polled MAX_POLLS times, still pending — show safe message
  | 'not_found'; // No payment_sessions row at all after all retries — show safe message

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { clearCart } = useCart();
  const [phase, setPhase] = useState<PagePhase>('polling');
  const pollCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    clearCart();

    if (!sessionId) {
      // No session_id in the URL — this was a direct navigation, not a Stripe redirect.
      setPhase('not_found');
      return;
    }

    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;

      try {
        // Query WITHOUT a status filter so we can distinguish "pending" (webhook
        // in-flight) from "not found at all" (genuine error or wrong session id).
        const { data } = await supabase
          .from('payment_sessions')
          .select('id, status, orderId, amount')
          .eq('stripeSessionId', sessionId)
          .maybeSingle();

        if (cancelled) return;

        if (data) {
          const row = data as { id: string; status: string; orderId?: string | null; amount?: number | null };

          if (row.status === 'completed') {
            // Webhook has processed — fire analytics and show the success page.
            if (row.orderId) {
              trackOfferPaid({ orderId: row.orderId, amountPence: Math.round((row.amount ?? 0) * 100) });
            }
            setPhase('confirmed');
            return;
          }

          // Row exists but status is still 'pending' — webhook hasn't fired yet.
          // Keep polling up to MAX_POLLS times.
          pollCount.current += 1;
          if (pollCount.current >= MAX_POLLS) {
            // Give up waiting — payment was received (row exists) but confirmation
            // is taking longer than expected.  Show a safe message instead of an
            // error so the user is not alarmed.
            setPhase('timeout');
            return;
          }

          timerRef.current = setTimeout(() => { void poll(); }, POLL_INTERVAL_MS);
          return;
        }

        // No row found at all yet — the create-checkout function may not have
        // finished inserting it.  Retry up to MAX_POLLS times.
        pollCount.current += 1;
        if (pollCount.current >= MAX_POLLS) {
          setPhase('not_found');
          return;
        }

        timerRef.current = setTimeout(() => { void poll(); }, POLL_INTERVAL_MS);
      } catch (err) {
        // Network/DB error — log for diagnostics and keep retrying.
        console.warn('OrderSuccessPage: poll error', err);
        if (cancelled) return;
        pollCount.current += 1;
        if (pollCount.current >= MAX_POLLS) {
          setPhase('timeout');
          return;
        }
        timerRef.current = setTimeout(() => { void poll(); }, POLL_INTERVAL_MS);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Polling spinner — "Confirming your payment…" ──────────────────────────
  if (phase === 'polling') {
    return (
      <MainLayout>
        <main id="main-content" className="flex-1 pt-28 pb-20 px-4 flex items-start justify-center">
          <div className="w-full max-w-lg mt-10">
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">Confirming your payment…</h1>
              <p className="text-slate-500 text-sm">
                Please wait while we confirm your order. This usually takes just a few seconds.
              </p>
            </div>
          </div>
        </main>
      </MainLayout>
    );
  }

  // ── Timeout — payment received but confirmation still in-flight ──────────
  if (phase === 'timeout' || phase === 'not_found') {
    return (
      <MainLayout>
        <main id="main-content" className="flex-1 pt-28 pb-20 px-4 flex items-start justify-center">
          <div className="w-full max-w-lg mt-10">
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Clock className="w-10 h-10 text-amber-400" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">Payment Received</h1>
              <p className="text-slate-600 text-sm mb-4">
                Your payment was received. Your order is being confirmed — this can take a minute or two.
                Please check your <strong>Orders page</strong> shortly and you should see it there.
              </p>
              {sessionId && (
                <p className="text-slate-400 text-xs mb-6 font-mono">
                  Ref: {sessionId.slice(0, 8)}…{sessionId.slice(-4)}
                </p>
              )}
              <p className="text-slate-500 text-xs mb-6">
                If your order does not appear within 10 minutes, please{' '}
                <Link to="/contact" className="text-blue-600 underline">contact support</Link>{' '}
                with the reference above.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/buyer/orders"
                  className="flex-1 flex items-center justify-center gap-2 font-bold rounded-full py-3 px-6 text-white"
                  style={{ background: "linear-gradient(90deg,#22c55e 0%,#16a34a 100%)" }}
                >
                  <ShoppingBag className="w-5 h-5" />
                  View My Orders
                </Link>
                <Link
                  to="/catalog"
                  className="flex-1 flex items-center justify-center gap-2 font-semibold rounded-full py-3 px-6 text-slate-700 border border-gray-300 hover:bg-gray-50"
                >
                  Continue Shopping
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </main>
      </MainLayout>
    );
  }

  // ── Confirmed success page ─────────────────────────────────────────────────
  return (
    <MainLayout>
      <main id="main-content" className="flex-1 pt-28 pb-20 px-4 flex items-start justify-center">
        <div className="w-full max-w-lg mt-10">
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            {/* Success Icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-bold text-slate-900 mb-3">Order Confirmed!</h1>
            <p className="text-slate-600 text-base mb-2">
              Thank you for your purchase. Your order has been successfully placed.
            </p>
            {sessionId && (
              <p className="text-slate-500 text-xs mb-6 font-mono">
                Ref: {sessionId.slice(0, 8)}…{sessionId.slice(-4)}
              </p>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg flex-shrink-0">
                  <Package className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-900 font-semibold text-sm">Order Processing</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Your order is being processed and will be dispatched soon.
                  </p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-900 font-semibold text-sm">Confirmation Email</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    A confirmation email has been sent to your inbox.
                  </p>
                </div>
              </div>
            </div>

            {/* Marketplace Trust Badges */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8 text-left">
              <p className="text-slate-900 text-sm font-semibold mb-3">Marketplace Checkout Complete</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-slate-600 text-xs">Secure Marketplace Checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-slate-600 text-xs">Seller Fulfilled Shipping</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-slate-600 text-xs">Independent Marketplace Sellers</span>
                </div>
              </div>
              <p className="text-slate-500 text-xs mt-3 leading-relaxed">
                Your item will be packaged and shipped directly by the seller.
                If there is an issue with your order, you can raise a dispute from your orders page within {BRAND.returnsDays} days of delivery.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/buyer/orders"
                className="flex-1 flex items-center justify-center gap-2 font-bold rounded-full py-3 px-6 text-white"
                style={{ background: "linear-gradient(90deg,#22c55e 0%,#16a34a 100%)" }}
              >
                <ShoppingBag className="w-5 h-5" />
                View My Orders
              </Link>
              <Link
                to="/catalog"
                className="flex-1 flex items-center justify-center gap-2 font-semibold rounded-full py-3 px-6 text-slate-700 border border-gray-300 hover:bg-gray-50"
              >
                Continue Shopping
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}
