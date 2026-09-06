/**
 * MobileOrdersPage — native marketplace order history for purchases and sales.
 * Keeps buyer and seller views separated while preserving authoritative
 * order/snapshot loading and buyer deep-link behaviour.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Package, AlertCircle, ChevronRight, HelpCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useAuthPromptStore } from "@/store/authPromptStore";
import MobileBottomNav from "@/components/MobileBottomNav";

interface OrderRow {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  quantity: number;
  productTitle: string | null;
  productImage: string | null;
  buyerName: string | null;
}

type BuyerLookup = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

type Tab = "all" | "pending" | "shipped" | "delivered" | "cancelled";
type OrderMode = "buy" | "sell";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  awaiting_payment: { label: "Awaiting payment", className: "bg-[#FFF5DF] text-[#8A5A00]" },
  paid: { label: "Paid", className: "bg-[#EAF1FF] text-[#1D57D8]" },
  packed: { label: "Packed", className: "bg-[#EEF2F7] text-[#475569]" },
  shipped: { label: "Shipped", className: "bg-[#EAF1FF] text-[#1D57D8]" },
  delivered: { label: "Delivered", className: "bg-emerald-50 text-emerald-700" },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600" },
  refunded: { label: "Refunded", className: "bg-[#EEF2F7] text-[#667085]" },
  invoice_requested: { label: "Invoice requested", className: "bg-violet-50 text-violet-700" },
};

function statusCfg(status: string) {
  return STATUS_CONFIG[status] ?? { label: status.replace(/_/g, " "), className: "bg-[#EEF2F7] text-[#667085]" };
}

function OrderCard({ order, highlighted, cardRef, mode }: {
  order: OrderRow;
  highlighted: boolean;
  cardRef?: React.RefObject<HTMLDivElement | null>;
  mode: OrderMode;
}) {
  const navigate = useNavigate();
  const cfg = statusCfg(order.status);
  const openOrder = () => {
    if (mode === "sell") {
      navigate(`/tracking/${order.orderNumber || order.id}`);
      return;
    }
    navigate(`/buyer/orders?orderId=${order.id}`);
  };

  return (
    <div
      ref={cardRef as React.RefObject<HTMLDivElement>}
      role="button"
      tabIndex={0}
      onClick={openOrder}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") openOrder();
      }}
      className={`flex cursor-pointer items-start gap-3 rounded-[18px] border bg-white p-3.5 shadow-[0_7px_22px_rgba(10,35,79,0.06)] transition ${highlighted ? 'border-[#F5A300] ring-2 ring-[#F5A300]/20' : 'border-[#0A234F]/[0.08]'}`}
    >
      <div className="flex h-[78px] w-[78px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#EEF2F7]">
        {order.productImage ? (
          <img src={order.productImage} alt={order.productTitle ?? "Product"} className="h-full w-full object-cover" />
        ) : (
          <Package className="h-8 w-8 text-[#A0A8B4]" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[10px] font-semibold text-[#7A8493]">#{order.orderNumber}</span>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${cfg.className}`}>{cfg.label}</span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[13px] font-extrabold leading-[1.3] text-[#26354A]">{order.productTitle ?? "Order"}</p>
        {mode === "sell" ? (
          <p className="mt-1 truncate text-[10px] font-semibold text-[#667085]">Buyer: {order.buyerName ?? "Customer"}</p>
        ) : null}
        <div className="mt-1.5 flex items-center gap-2 text-[10px] font-medium text-[#7A8493]">
          <span>Qty {order.quantity}</span><span aria-hidden="true">•</span><span>{formatDate(order.createdAt)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[14px] font-black text-[#0A234F]">£{order.total.toFixed(2)}</span>
          <ChevronRight className="h-4 w-4 text-[#A0A8B4]" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export default function MobileOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkOrderId = searchParams.get("orderId");
  const requestedMode = searchParams.get("mode");
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((s) => s.open);
  const mode: OrderMode = requestedMode === "sell" ? "sell" : "buy";
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const cardRefs = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map());

  const changeMode = (nextMode: OrderMode) => {
    const next = new URLSearchParams(searchParams);
    next.set("mode", nextMode);
    next.delete("orderId");
    setActiveTab("all");
    setSearchParams(next, { replace: true });
  };

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

        const ownerColumn = mode === "sell" ? "sellerId" : "buyerId";
        const { data, error } = await supabase
          .from("orders")
          .select(`id, orderNumber, total, status, createdAt, quantity, buyerId, buyerNameSnapshot, commercialSnapshotSource, products:productId(title, images), order_items(productTitleSnapshot, productImageSnapshot, productSnapshotSource)`)
          .eq(ownerColumn, user.id)
          .order("createdAt", { ascending: false });

        if (error || !data) {
          setOrders([]);
          return;
        }

        const sourceRows = data as unknown as Array<{
          id: string;
          orderNumber: string;
          total: number;
          status: string;
          createdAt: string;
          quantity: number;
          buyerId: string | null;
          buyerNameSnapshot: string | null;
          commercialSnapshotSource: string | null;
          products: { title: string; images: string[] | null } | null;
          order_items: Array<{ productTitleSnapshot: string | null; productImageSnapshot: string | null; productSnapshotSource: string | null }> | null;
        }>;

        const buyerNameById: Record<string, string> = {};
        if (mode === "sell") {
          const legacyBuyerIds = [...new Set(
            sourceRows
              .filter((order) => !order.commercialSnapshotSource || !order.buyerNameSnapshot?.trim())
              .map((order) => order.buyerId)
              .filter((id): id is string => Boolean(id)),
          )];

          if (legacyBuyerIds.length > 0) {
            const { data: buyers } = await supabase
              .from("users")
              .select("id, firstName, lastName")
              .in("id", legacyBuyerIds);

            (buyers as BuyerLookup[] | null)?.forEach((buyer) => {
              const name = [buyer.firstName, buyer.lastName].filter(Boolean).join(" ").trim();
              buyerNameById[buyer.id] = name || "Customer";
            });
          }
        }

        const rows: OrderRow[] = sourceRows.map((order) => {
          const snapshotItem = order.order_items?.find((item) => item.productSnapshotSource != null) ?? null;
          const snapshotBuyerName = order.buyerNameSnapshot?.trim();
          return {
            id: order.id,
            orderNumber: order.orderNumber,
            total: order.total,
            status: order.status,
            createdAt: order.createdAt,
            quantity: order.quantity ?? 1,
            productTitle: snapshotItem ? snapshotItem.productTitleSnapshot : order.products?.title ?? null,
            productImage: snapshotItem ? snapshotItem.productImageSnapshot : (order.products?.images ?? [])[0] ?? null,
            buyerName: mode === "sell"
              ? (snapshotBuyerName || (order.buyerId ? buyerNameById[order.buyerId] : null) || "Customer")
              : null,
          };
        });
        setOrders(rows);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.id, mode, promptAuth]);

  useEffect(() => {
    if (!deepLinkOrderId || loading) return;
    const ref = cardRefs.current.get(deepLinkOrderId);
    if (ref?.current) ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [deepLinkOrderId, loading]);

  const visibleOrders = activeTab === "all" ? orders : orders.filter((order) => TAB_STATUSES[activeTab].includes(order.status));
  const hasAwaitingPayment = mode === "buy" && orders.some((order) => order.status === "awaiting_payment");

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#0A234F] md:hidden">
      <header
        className="sticky top-0 z-30 border-b border-[#0A234F]/[0.08] bg-white/95 px-[var(--mob-side,16px)]"
        style={{ paddingTop: "calc(0.9rem + env(safe-area-inset-top, 0px))", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}
      >
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#C98200]">{mode === "sell" ? "Sales" : "Purchases"}</p>
        <div className="flex items-end justify-between gap-3">
          <h1 className="mt-1 text-[22px] font-black tracking-[-0.03em] text-[#0A234F]">{mode === "sell" ? "Sold items" : "My orders"}</h1>
          <div className="mb-0.5 flex rounded-full bg-[#EEF2F7] p-1">
            <button
              type="button"
              onClick={() => changeMode("buy")}
              className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${mode === "buy" ? "bg-[#0A234F] text-white" : "text-[#667085]"}`}
            >
              Purchases
            </button>
            <button
              type="button"
              onClick={() => changeMode("sell")}
              className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${mode === "sell" ? "bg-[#0A234F] text-white" : "text-[#667085]"}`}
            >
              Sales
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-9 shrink-0 rounded-full px-3 text-[11px] font-extrabold ${active ? 'bg-[#0A234F] text-white' : 'border border-[#0A234F]/10 bg-[#F7F9FC] text-[#667085]'}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-[var(--mob-side,16px)] py-4" style={{ paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))" }}>
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((n) => <div key={n} className="h-[108px] animate-pulse rounded-[18px] bg-[#E8EDF3]" />)}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#0A234F]/[0.08] bg-white px-6 py-14 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EEF2F7]"><Package className="h-7 w-7 text-[#94A3B8]" aria-hidden="true" /></div>
            <p className="mt-4 text-[15px] font-extrabold text-[#0A234F]">{activeTab === "all" ? (mode === "sell" ? "No sales yet" : "No orders yet") : "Nothing in this section"}</p>
            <p className="mt-1 text-[12px] leading-[1.45] text-[#7A8493]">{activeTab === "all" ? (mode === "sell" ? "Items sold through Loadify will appear here." : "Items you buy on Loadify will appear here.") : "Try another order status."}</p>
            {activeTab === "all" && mode === "buy" && <Link to="/catalog" className="mt-5 rounded-[13px] bg-[#0A234F] px-4 py-2.5 text-[12px] font-extrabold text-white no-underline">Browse marketplace</Link>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleOrders.map((order) => {
              if (!cardRefs.current.has(order.id)) cardRefs.current.set(order.id, { current: null });
              return <OrderCard key={order.id} order={order} mode={mode} highlighted={order.id === deepLinkOrderId} cardRef={cardRefs.current.get(order.id)} />;
            })}
          </div>
        )}

        {!loading && hasAwaitingPayment && (
          <div className="mt-3 flex items-start gap-2 rounded-[14px] border border-[#F5A300]/40 bg-[#FFF8E8] p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#C98200]" aria-hidden="true" />
            <p className="text-[11px] leading-relaxed text-[#795300]">You have orders awaiting payment. Open the order to complete checkout before the reservation expires.</p>
          </div>
        )}

        {!loading && (
          <button onClick={() => navigate("/buyer/profile")} className="mt-4 flex h-12 w-full items-center gap-2 rounded-[14px] border border-[#0A234F]/10 bg-white px-3 text-left">
            <HelpCircle className="h-4 w-4 shrink-0 text-[#667085]" aria-hidden="true" />
            <span className="flex-1 text-[12px] font-bold text-[#475569]">Need help with an order?</span>
            <ChevronRight className="h-4 w-4 text-[#A0A8B4]" aria-hidden="true" />
          </button>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}