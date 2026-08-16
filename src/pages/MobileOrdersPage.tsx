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
import { useAuthPromptStore } from "@/store/authPromptStore";
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
}

type Tab = "all" | "pending" | "shipped" | "delivered" | "cancelled";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

const TAB_STATUSES: Record<Tab, string[]> = {
  all: [],
  pending: ["awaiting_payment", "paid", "packed", "invoice_requested"],
  shipped: ["shipped"],
  delivered: ["delivered", "completed"],
  cancelled: ["cancelled", "refunded"],
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
  { label: string; className: string }
> = {
  awaiting_payment: { label: "Awaiting payment", className: "bg-primary/15 text-primary" },
  paid:             { label: "Paid",              className: "bg-admin/15 text-admin" },
  packed:           { label: "Packed",            className: "bg-primary/15 text-primary" },
  shipped:          { label: "Shipped",           className: "bg-secondary/15 text-secondary" },
  delivered:        { label: "Delivered",         className: "bg-accent/15 text-accent" },
  completed:        { label: "Completed",         className: "bg-accent/15 text-accent" },
  cancelled:        { label: "Cancelled",         className: "bg-danger/15 text-danger" },
  refunded:         { label: "Refunded",          className: "bg-white/[0.08] text-foreground/75" },
  invoice_requested:{ label: "Invoice requested", className: "bg-secondary/15 text-secondary" },
};

function statusCfg(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status.replace(/_/g, " "),
      className: "bg-white/[0.08] text-foreground/75",
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
      className={`flex items-start gap-3 rounded-2xl p-3.5 cursor-pointer border transition-shadow ${highlighted ? 'bg-primary/[0.06] border-primary/35 shadow-[0_0_16px_rgba(212,175,55,0.12)]' : 'bg-card border-white/[0.07]'}`}
    >
      {/* Product thumbnail */}
      <div className="w-20 h-20 rounded-xl bg-white shrink-0 overflow-hidden flex items-center justify-center">
        {order.productImage ? (
          <img
            src={order.productImage}
            alt={order.productTitle ?? "Product"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Package className="w-8 h-8 text-muted-foreground" />
        )}
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Order number + status badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <span className="text-[11px] text-foreground/70 font-mono">
            #{order.orderNumber}
          </span>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-[20px] shrink-0 ${cfg.className}`}
          >
            {cfg.label}
          </span>
        </div>

        {/* Product title */}
        <p className="text-sm font-bold text-foreground line-clamp-2" style={{ lineHeight: 1.3, marginBottom: "5px" }}>
          {order.productTitle ?? "Order"}
        </p>

        {/* Qty */}
        <p className="text-xs text-foreground/70" style={{ marginBottom: "3px" }}>Qty: {order.quantity}</p>

        {/* Date + price */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="text-xs text-foreground/70">
            Order placed on {formatDate(order.createdAt)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" }}>
          <span className="text-[15px] font-extrabold text-primary">
            £{order.total.toFixed(2)}
          </span>
          <ChevronRight className="text-foreground/25" style={{ width: "16px", height: "16px", flexShrink: 0 }} />
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
  const promptAuth = useAuthPromptStore((s) => s.open);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  // Ref map for scroll-to on deep link
  const cardRefs = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(
    new Map()
  );

  useEffect(() => {
    if (!user?.id) {
      promptAuth();
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          promptAuth();
          return;
        }

        const { data } = await supabase
          .from("orders")
          .select(
            `id, orderNumber, total, status, createdAt, quantity,
             products:productId(title, images)`
          )
          .eq("buyerId", user.id)
          .order("createdAt", { ascending: false });

        if (!data) {
          setOrders([]);
          return;
        }

        const rows: OrderRow[] = (
          data as unknown as Array<{
            id: string;
            orderNumber: string;
            total: number;
            status: string;
            createdAt: string;
            quantity: number;
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
        }));

        setOrders(rows);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.id, promptAuth]);

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
      className="h-[100dvh] min-h-0 overflow-hidden flex flex-col bg-background"
    >
      {/* ── Header ── */}
      <div
        className="shrink-0 px-4 sticky top-0 z-10 bg-background/[0.97]"
        style={{
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "0",
        }}
      >
        <h1 className="text-[22px] font-extrabold text-foreground" style={{ marginBottom: "12px" }}>
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
                className={`text-[13px] whitespace-nowrap bg-transparent border-none cursor-pointer shrink-0 transition-colors duration-200 ${isActive ? 'text-primary font-bold border-b-2 border-primary' : 'text-foreground/65 font-normal border-b-2 border-transparent'}`}
                style={{ padding: "10px 14px" }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
      >
        {loading ? (
          [1, 2, 3].map((n) => (
            <div
              key={n}
              className="animate-pulse bg-white/[0.05]"
              style={{ height: "108px", borderRadius: "16px", marginBottom: "12px" }}
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
                className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold"
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
          <div className="flex items-start gap-2 rounded-xl bg-primary/10 border border-primary/40 p-3 mt-3">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-primary text-xs leading-relaxed">
              You have orders awaiting payment. Tap an order to complete checkout before the reservation expires.
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
            <HelpCircle className="text-foreground/60" style={{ width: "20px", height: "20px", flexShrink: 0 }} />
            <span className="text-sm text-foreground/75" style={{ flex: 1, textAlign: "left" }}>
              Need help with your order?
            </span>
            <ChevronRight className="text-foreground/25" style={{ width: "16px", height: "16px" }} />
          </button>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
