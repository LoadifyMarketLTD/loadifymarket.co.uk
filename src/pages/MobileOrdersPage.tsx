/**
 * MobileOrdersPage — /orders
 *
 * Standalone full-screen orders list for mobile users (buyers).
 * Accessible from MobileBottomNav "Account" dropdown or from a push
 * notification deep-link with ?orderId=… in the URL.
 *
 * Statuses rendered:
 *   awaiting_payment → "Awaiting payment"  (amber)
 *   paid             → "Paid"              (blue)
 *   packed           → "Packed"            (amber)
 *   shipped          → "Shipped"           (purple)
 *   delivered        → "Delivered"         (orange)
 *   completed        → "Completed"         (green)
 *   cancelled        → "Cancelled"         (red)
 *   refunded         → "Refunded"          (muted)
 *
 * Deep-link: /orders?orderId=<uuid>
 *   Scrolls to (and highlights) the matching order row.
 *
 * Unauthenticated users are redirected to /login.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Package, AlertCircle, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import MobileBottomNav from "@/components/MobileBottomNav";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderRow {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  productTitle: string | null;
  productImage: string | null;
  conversationId: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Status display config
const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  awaiting_payment: {
    label: "Awaiting payment",
    bg: "bg-amber-500/20",
    text: "text-amber-400",
  },
  paid: { label: "Paid", bg: "bg-blue-500/20", text: "text-blue-400" },
  packed: { label: "Packed", bg: "bg-amber-500/20", text: "text-amber-400" },
  shipped: {
    label: "Shipped",
    bg: "bg-purple-500/20",
    text: "text-purple-400",
  },
  delivered: {
    label: "Delivered",
    bg: "bg-orange-500/20",
    text: "text-orange-400",
  },
  completed: {
    label: "Completed",
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
  },
  cancelled: { label: "Cancelled", bg: "bg-red-500/20", text: "text-red-400" },
  refunded: {
    label: "Refunded",
    bg: "bg-white/10",
    text: "text-white/50",
  },
  invoice_requested: {
    label: "Invoice requested",
    bg: "bg-blue-500/20",
    text: "text-blue-400",
  },
};

function statusCfg(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status.replace(/_/g, " "),
      bg: "bg-white/10",
      text: "text-white/50",
    }
  );
}

// ── OrderCard ─────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  highlighted,
  cardRef,
}: {
  order: OrderRow;
  highlighted: boolean;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const navigate = useNavigate();
  const cfg = statusCfg(order.status);
  const isAwaitingPayment = order.status === "awaiting_payment";

  return (
    <div
      ref={cardRef as React.RefObject<HTMLDivElement>}
      className={`rounded-2xl border transition-all ${
        highlighted
          ? "border-[#FBBF24]/60 shadow-[0_0_16px_rgba(251,191,36,0.15)]"
          : "border-white/10"
      } bg-white/5 overflow-hidden`}
    >
      {/* Top row */}
      <div className="px-4 pt-3.5 pb-3 flex items-start gap-3">
        {/* Product thumbnail */}
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 shrink-0">
          {order.productImage ? (
            <img
              src={order.productImage}
              alt={order.productTitle ?? "Product"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-6 w-6 text-white/30" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight truncate">
            {order.productTitle ?? "Order"}
          </p>
          <p className="text-white/40 text-xs mt-0.5">
            #{order.orderNumber} · {formatDate(order.createdAt)}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}
            >
              {cfg.label}
            </span>
            <span className="text-[#FBBF24] text-xs font-bold">
              £{order.total.toFixed(2)}
            </span>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-white/20 shrink-0 mt-1" />
      </div>

      {/* CTA row */}
      {isAwaitingPayment && order.conversationId && (
        <div className="px-4 pb-3">
          <button
            onClick={() => navigate(`/inbox/${order.conversationId}`)}
            className="w-full py-2 rounded-xl bg-[#FBBF24] text-[#020617] text-sm font-bold flex items-center justify-center gap-1.5 active:bg-[#F59E0B] transition-colors"
          >
            Complete payment
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MobileOrdersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deepLinkOrderId = searchParams.get("orderId");
  const { user } = useAuthStore();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Ref map for scroll-to on deep link
  const cardRefs = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(
    new Map()
  );

  useEffect(() => {
    if (!user?.id) {
      navigate("/login", { state: { from: "/orders" }, replace: true });
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        // Ensure the Supabase session is ready before querying.  On APK cold
        // restart the @capacitor/preferences async restore may not have
        // completed yet, so getSession() forces the client to finish loading
        // the session and auto-refresh the token if it has expired.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/login", { state: { from: "/orders" }, replace: true });
          return;
        }

        const { data } = await supabase
          .from("orders")
          .select(
            `id, orderNumber, total, status, createdAt, offerId,
             products:productId(title, images)`
          )
          .eq("buyerId", user.id)
          .order("createdAt", { ascending: false });

        if (!data) {
          setOrders([]);
          return;
        }

        // Resolve conversationId via offerId → offers.conversationId
        const offerIds = (
          data as unknown as Array<{
            id: string;
            orderNumber: string;
            total: number;
            status: string;
            createdAt: string;
            offerId: string | null;
            products: { title: string; images: string[] | null } | null;
          }>
        )
          .map((o) => o.offerId)
          .filter((x): x is string => x != null);

        const convMap: Record<string, string> = {};
        if (offerIds.length > 0) {
          const { data: offerRows } = await supabase
            .from("offers")
            .select("id, conversationId")
            .in("id", offerIds);
          (offerRows ?? []).forEach(
            (r: { id: string; conversationId: string }) => {
              convMap[r.id] = r.conversationId;
            }
          );
        }

        const rows: OrderRow[] = (
          data as unknown as Array<{
            id: string;
            orderNumber: string;
            total: number;
            status: string;
            createdAt: string;
            offerId: string | null;
            products: { title: string; images: string[] | null } | null;
          }>
        ).map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          total: o.total,
          status: o.status,
          createdAt: o.createdAt,
          productTitle: o.products?.title ?? null,
          productImage:
            (o.products?.images ?? [])[0] ?? null,
          conversationId: o.offerId ? (convMap[o.offerId] ?? null) : null,
        }));

        setOrders(rows);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.id, navigate]);

  // Scroll to deep-linked order once data is loaded
  useEffect(() => {
    if (!deepLinkOrderId || loading) return;
    const ref = cardRefs.current.get(deepLinkOrderId);
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [deepLinkOrderId, loading]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0B0F1A" }}
    >
      {/* Header */}
      <div
        className="shrink-0 px-4 pt-4 pb-3 flex items-center gap-3 sticky top-0 z-10"
        style={{
          background: "rgba(11,15,26,0.97)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/5 active:bg-white/10 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">My Orders</h1>
        <Link
          to="/buyer/orders"
          className="text-xs text-[#FBBF24] font-semibold py-1 px-2 rounded-lg bg-[#FBBF24]/10 active:bg-[#FBBF24]/20"
        >
          Full view
        </Link>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
      >
        {loading ? (
          /* Skeleton */
          [1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-24 rounded-2xl bg-white/5 animate-pulse"
            />
          ))
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <Package className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-white/50 text-sm">No orders yet</p>
            <Link
              to="/catalog"
              className="px-4 py-2 rounded-xl bg-[#FBBF24]/10 text-[#FBBF24] text-sm font-semibold"
            >
              Start browsing
            </Link>
          </div>
        ) : (
          orders.map((order) => {
            if (!cardRefs.current.has(order.id)) {
              cardRefs.current.set(order.id, { current: null });
            }
            return (
              <OrderCard
                key={order.id}
                order={order}
                highlighted={order.id === deepLinkOrderId}
                cardRef={cardRefs.current.get(order.id)}
              />
            );
          })
        )}

        {/* Awaiting payment notice */}
        {!loading &&
          orders.some((o) => o.status === "awaiting_payment") && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-amber-300 text-xs leading-relaxed">
                You have offers awaiting payment. Tap "Complete payment" to
                finish checkout before the reservation expires.
              </p>
            </div>
          )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
