/**
 * MobileOrdersPage — /orders
 *
 * Standalone full-screen orders list for mobile users (buyers).
 * Accessible from Profile or from a push notification deep-link
 * with ?orderId=… in the URL.
 *
 * Tabs: All Orders | To Pay | To Ship | Shipped | Completed | Cancelled
 *
 * Unauthenticated users are redirected to /login.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Package, AlertCircle, ChevronRight, HelpCircle } from "lucide-react";
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
  quantity: number;
  productTitle: string | null;
  productImage: string | null;
  conversationId: string | null;
}

type Tab = "all" | "pending" | "shipped" | "delivered";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
];

const TAB_STATUSES: Record<Tab, string[]> = {
  all: [],
  pending: ["awaiting_payment", "paid", "packed", "invoice_requested"],
  shipped: ["shipped"],
  delivered: ["delivered", "completed", "cancelled", "refunded"],
};

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
    bg: "rgba(245,185,66,0.15)",
    text: "#F5B942",
  },
  paid: { label: "Paid", bg: "rgba(139,92,246,0.15)", text: "#A78BFA" },
  packed: { label: "Packed", bg: "rgba(245,185,66,0.15)", text: "#F5B942" },
  shipped: {
    label: "Shipped",
    bg: "rgba(59,130,246,0.15)",
    text: "#60A5FA",
  },
  delivered: {
    label: "Delivered",
    bg: "rgba(16,185,129,0.15)",
    text: "#34D399",
  },
  completed: {
    label: "Completed",
    bg: "rgba(16,185,129,0.15)",
    text: "#34D399",
  },
  cancelled: { label: "Cancelled", bg: "rgba(239,68,68,0.15)", text: "#F87171" },
  refunded: {
    label: "Refunded",
    bg: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.75)",
  },
  invoice_requested: {
    label: "Invoice requested",
    bg: "rgba(59,130,246,0.15)",
    text: "#60A5FA",
  },
};

function statusCfg(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status.replace(/_/g, " "),
      bg: "rgba(255,255,255,0.08)",
      text: "rgba(255,255,255,0.75)",
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

  return (
    <div
      ref={cardRef as React.RefObject<HTMLDivElement>}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/buyer/orders?orderId=${order.id}`)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/buyer/orders?orderId=${order.id}`); }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        background: highlighted ? "rgba(245,185,66,0.06)" : "#12121A",
        border: `1px solid ${highlighted ? "rgba(245,185,66,0.35)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: "16px",
        padding: "14px",
        cursor: "pointer",
        boxShadow: highlighted ? "0 0 16px rgba(245,185,66,0.12)" : "none",
      }}
    >
      {/* Product thumbnail */}
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "12px",
          background: "#FFFFFF",
          flexShrink: 0,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {order.productImage ? (
          <img
            src={order.productImage}
            alt={order.productTitle ?? "Product"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Package style={{ width: "32px", height: "32px", color: "#9CA3AF" }} />
        )}
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Order number + status badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.70)", fontFamily: "monospace" }}>
            #{order.orderNumber}
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: "20px",
              background: cfg.bg,
              color: cfg.text,
              flexShrink: 0,
            }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Product title */}
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.3, marginBottom: "5px" }}
          className="line-clamp-2">
          {order.productTitle ?? "Order"}
        </p>

        {/* Qty */}
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.70)", marginBottom: "3px" }}>Qty: {order.quantity}</p>

        {/* Date + price */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.70)" }}>
            Order placed on {formatDate(order.createdAt)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" }}>
          <span style={{ fontSize: "15px", fontWeight: 800, color: "#F5B942" }}>
            £{order.total.toFixed(2)}
          </span>
          <ChevronRight style={{ width: "16px", height: "16px", color: "rgba(255,255,255,0.25)", flexShrink: 0 }} />
        </div>
      </div>
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
  const [activeTab, setActiveTab] = useState<Tab>("all");

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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/login", { state: { from: "/orders" }, replace: true });
          return;
        }

        const { data } = await supabase
          .from("orders")
          .select(
            `id, orderNumber, total, status, createdAt, offerId, quantity,
             products:productId(title, images)`
          )
          .eq("buyerId", user.id)
          .order("createdAt", { ascending: false });

        if (!data) {
          setOrders([]);
          return;
        }

        const offerIds = (
          data as unknown as Array<{
            id: string;
            orderNumber: string;
            total: number;
            status: string;
            createdAt: string;
            quantity: number;
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
            quantity: number;
            offerId: string | null;
            products: { title: string; images: string[] | null } | null;
          }>
        ).map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          total: o.total,
          status: o.status,
          createdAt: o.createdAt,
          quantity: o.quantity ?? 1,
          productTitle: o.products?.title ?? null,
          productImage: (o.products?.images ?? [])[0] ?? null,
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

  // Filter orders by active tab
  const visibleOrders = activeTab === "all"
    ? orders
    : orders.filter((o) => TAB_STATUSES[activeTab].includes(o.status));

  const hasAwaitingPayment = orders.some((o) => o.status === "awaiting_payment");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#07080B" }}
    >
      {/* ── Header ── */}
      <div
        className="shrink-0 px-4 sticky top-0 z-10"
        style={{
          background: "rgba(7,8,11,0.97)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "0",
        }}
      >
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#FFFFFF", marginBottom: "12px" }}>
          My Orders
        </h1>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            overflowX: "auto",
            gap: "0",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
          className="[-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "#F5B942" : "rgba(255,255,255,0.65)",
                  whiteSpace: "nowrap",
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive ? "2px solid #F5B942" : "2px solid transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "color 0.2s, border-color 0.2s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
      >
        {loading ? (
          [1, 2, 3].map((n) => (
            <div
              key={n}
              style={{ height: "108px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", marginBottom: "12px" }}
              className="animate-pulse"
            />
          ))
        ) : visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <Package className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-white/75 text-sm">
              {activeTab === "all" ? "No orders yet" : "No orders in this category"}
            </p>
            {activeTab === "all" && (
              <Link
                to="/catalog"
                className="px-4 py-2 rounded-xl bg-[#FBBF24]/10 text-[#FBBF24] text-sm font-semibold"
              >
                Start browsing
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {visibleOrders.map((order) => {
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
            })}
          </div>
        )}

        {/* Awaiting payment notice */}
        {!loading && hasAwaitingPayment && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 mt-3">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-amber-300 text-xs leading-relaxed">
              You have offers awaiting payment. Tap an order to complete checkout before the reservation expires.
            </p>
          </div>
        )}

        {/* Need help footer */}
        {!loading && (
          <button
            onClick={() => navigate("/buyer/profile")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "16px 4px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              marginTop: "8px",
            }}
          >
            <HelpCircle style={{ width: "20px", height: "20px", color: "rgba(255,255,255,0.60)", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: "14px", color: "rgba(255,255,255,0.75)", textAlign: "left" }}>
              Need help with your order?
            </span>
            <ChevronRight style={{ width: "16px", height: "16px", color: "rgba(255,255,255,0.25)" }} />
          </button>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
