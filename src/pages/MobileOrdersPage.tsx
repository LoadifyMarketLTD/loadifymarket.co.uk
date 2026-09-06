/**
 * MobileOrdersPage — native marketplace order history and order details.
 * Purchases and sales share one transaction model while preserving each user's
 * perspective. The native detail surface stays inside the marketplace app.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Loader2,
  MessageSquare,
  Package,
  RotateCcw,
  Truck,
} from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import { toast } from "@/hooks/use-toast";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useAuthPromptStore } from "@/store/authPromptStore";

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

type ShipmentRow = {
  id: string;
  status: string;
  courier_name: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
};

type ShipmentEventRow = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
};

type ReturnRow = {
  id: string;
  status: string;
  reason: string;
  refundAmount: number | null;
  createdAt: string;
};

type OrderItemRow = {
  id: string;
  quantity: number | null;
  productTitleSnapshot: string | null;
  productImageSnapshot: string | null;
  productSnapshotSource: string | null;
};

type OrderDetail = OrderRow & {
  buyerId: string | null;
  sellerId: string | null;
  sellerName: string | null;
  shipment: ShipmentRow | null;
  events: ShipmentEventRow[];
  returnRequest: ReturnRow | null;
  orderItemId: string | null;
  orderItemQuantity: number;
};

type ReturnDecision = "eligible_for_return_request" | "manual_review" | "ineligible";

type ReturnEligibilityResponse = {
  ok?: boolean;
  error?: string;
  result?: {
    decision?: ReturnDecision;
    reason?: string;
    automaticRefundExecutionAllowed?: boolean;
    paymentMutationAllowed?: boolean;
  };
};

type ConversationResolveResponse = {
  conversationId?: string;
  created?: boolean;
  error?: string;
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

const RETURN_REASONS = [
  { value: "changed_mind", label: "Changed my mind" },
  { value: "not_as_described", label: "Not as described" },
  { value: "damaged", label: "Arrived damaged" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "other", label: "Other" },
] as const;

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
  return STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, " "),
    className: "bg-[#EEF2F7] text-[#667085]",
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fullName(row: BuyerLookup | null | undefined) {
  if (!row) return null;
  return [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || null;
}

function OrderCard({ order, mode }: { order: OrderRow; mode: OrderMode }) {
  const navigate = useNavigate();
  const cfg = statusCfg(order.status);
  const openOrder = () => navigate(`/orders?mode=${mode}&orderId=${encodeURIComponent(order.id)}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openOrder}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openOrder(); }}
      className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-[#0A234F]/[0.08] bg-white p-3.5 shadow-[0_7px_22px_rgba(10,35,79,0.06)] transition"
    >
      <div className="flex h-[78px] w-[78px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#EEF2F7]">
        {order.productImage ? <img src={order.productImage} alt={order.productTitle ?? "Product"} className="h-full w-full object-cover" /> : <Package className="h-8 w-8 text-[#A0A8B4]" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[10px] font-semibold text-[#7A8493]">#{order.orderNumber}</span>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${cfg.className}`}>{cfg.label}</span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[13px] font-extrabold leading-[1.3] text-[#26354A]">{order.productTitle ?? "Order"}</p>
        {mode === "sell" ? <p className="mt-1 truncate text-[10px] font-semibold text-[#667085]">Buyer: {order.buyerName ?? "Customer"}</p> : null}
        <div className="mt-1.5 flex items-center gap-2 text-[10px] font-medium text-[#7A8493]"><span>Qty {order.quantity}</span><span aria-hidden="true">•</span><span>{formatDate(order.createdAt)}</span></div>
        <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[14px] font-black text-[#0A234F]">£{order.total.toFixed(2)}</span><ChevronRight className="h-4 w-4 text-[#A0A8B4]" aria-hidden="true" /></div>
      </div>
    </div>
  );
}

function MobileOrderDetail({ orderId, requestedMode, onBack }: { orderId: string; requestedMode: OrderMode; onBack: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [mode, setMode] = useState<OrderMode>(requestedMode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnDescription, setReturnDescription] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [messageOpening, setMessageOpening] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select(`id, orderNumber, total, status, createdAt, quantity, buyerId, sellerId, buyerNameSnapshot, sellerBusinessNameSnapshot, commercialSnapshotSource, products:productId(title, images), order_items(id, quantity, productTitleSnapshot, productImageSnapshot, productSnapshotSource)`)
          .eq("id", orderId)
          .maybeSingle();
        if (orderError || !orderData) { setError("This order could not be loaded."); return; }

        const raw = orderData as unknown as {
          id: string;
          orderNumber: string;
          total: number;
          status: string;
          createdAt: string;
          quantity: number;
          buyerId: string | null;
          sellerId: string | null;
          buyerNameSnapshot: string | null;
          sellerBusinessNameSnapshot: string | null;
          commercialSnapshotSource: string | null;
          products: { title: string; images: string[] | null } | null;
          order_items: OrderItemRow[] | null;
        };

        const isBuyer = raw.buyerId === user.id;
        const isSeller = raw.sellerId === user.id;
        if (!isBuyer && !isSeller) { setError("You do not have access to this order."); return; }

        const actualMode: OrderMode = requestedMode === "sell" && isSeller ? "sell" : requestedMode === "buy" && isBuyer ? "buy" : isSeller ? "sell" : "buy";
        setMode(actualMode);

        const counterpartId = actualMode === "sell" ? raw.buyerId : raw.sellerId;
        let counterpartName = actualMode === "sell" ? raw.buyerNameSnapshot?.trim() || null : raw.sellerBusinessNameSnapshot?.trim() || null;
        if (!counterpartName && counterpartId) {
          const { data: display } = await supabase.from("user_display_names").select("id, firstName, lastName").eq("id", counterpartId).maybeSingle();
          counterpartName = fullName(display as BuyerLookup | null);
        }

        const { data: shipmentData } = await supabase.from("shipments").select("id, status, courier_name, tracking_number, created_at, updated_at").eq("order_id", raw.id).maybeSingle();
        let events: ShipmentEventRow[] = [];
        if (shipmentData?.id) {
          const { data: eventRows } = await supabase.from("shipment_events").select("id, status, message, created_at").eq("shipment_id", shipmentData.id).order("created_at", { ascending: true });
          events = (eventRows ?? []) as ShipmentEventRow[];
        }

        const { data: returnRows } = await supabase.from("returns").select("id, status, reason, refundAmount, createdAt").eq("orderId", raw.id).order("createdAt", { ascending: false }).limit(1);
        const snapshotItem = raw.order_items?.find((item) => item.productSnapshotSource != null) ?? raw.order_items?.[0] ?? null;

        setDetail({
          id: raw.id,
          orderNumber: raw.orderNumber,
          total: raw.total,
          status: raw.status,
          createdAt: raw.createdAt,
          quantity: raw.quantity ?? 1,
          productTitle: snapshotItem ? snapshotItem.productTitleSnapshot : raw.products?.title ?? null,
          productImage: snapshotItem ? snapshotItem.productImageSnapshot : (raw.products?.images ?? [])[0] ?? null,
          buyerName: actualMode === "sell" ? counterpartName ?? "Customer" : null,
          sellerName: actualMode === "buy" ? counterpartName ?? "Seller" : null,
          buyerId: raw.buyerId,
          sellerId: raw.sellerId,
          shipment: (shipmentData as ShipmentRow | null) ?? null,
          events,
          returnRequest: ((returnRows ?? [])[0] as ReturnRow | undefined) ?? null,
          orderItemId: snapshotItem?.id ?? null,
          orderItemQuantity: snapshotItem?.quantity ?? raw.quantity ?? 1,
        });
      } catch {
        setError("This order could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [orderId, requestedMode, user?.id]);

  const submitReturn = async () => {
    if (!detail || !user?.id || mode !== "buy" || returnSubmitting) return;
    if (!detail.sellerId || !detail.orderItemId) {
      toast({ title: "Cannot request return", description: "Order item or seller information is unavailable. Please contact support.", variant: "destructive" });
      return;
    }
    if (!returnReason || !returnDescription.trim()) {
      toast({ title: "Complete return details", description: "Choose a reason and describe the problem before submitting.", variant: "destructive" });
      return;
    }

    setReturnSubmitting(true);
    try {
      const { data: existing } = await supabase.from("returns").select("id, status").eq("orderId", detail.id).neq("status", "rejected").maybeSingle();
      if (existing) {
        toast({ title: "Return already submitted", description: "A return request for this order is already open or in progress.", variant: "destructive" });
        setReturnOpen(false);
        return;
      }

      const eligibilityResponse = await authorizedFetch("/.netlify/functions/customer-return-eligibility", {
        method: "POST",
        body: JSON.stringify({
          orderId: detail.id,
          orderItemId: detail.orderItemId,
          quantity: detail.orderItemQuantity,
          reasonCode: returnReason,
        }),
      });
      const eligibility = await eligibilityResponse.json() as ReturnEligibilityResponse;
      if (!eligibilityResponse.ok) throw new Error(eligibility.error || "Return eligibility could not be checked.");
      const decision = eligibility.result?.decision;
      if (decision === "ineligible") {
        toast({ title: "Return not available", description: "This order is outside the current return eligibility boundary.", variant: "destructive" });
        return;
      }

      if (eligibility.result?.automaticRefundExecutionAllowed !== false || eligibility.result?.paymentMutationAllowed !== false) {
        throw new Error("Unsafe return policy response. No return was created.");
      }

      const { data: created, error: insertError } = await supabase.from("returns").insert({
        orderId: detail.id,
        buyerId: user.id,
        sellerId: detail.sellerId,
        reason: returnReason,
        description: returnDescription.trim(),
        status: "requested",
      }).select("id, status, reason, refundAmount, createdAt").single();
      if (insertError) throw insertError;

      setDetail((current) => current ? { ...current, returnRequest: created as ReturnRow } : current);
      setReturnOpen(false);
      setReturnReason("");
      setReturnDescription("");
      toast({
        title: "Return requested",
        description: decision === "manual_review" ? "Your request was submitted for manual review. No refund has been executed." : "Your return request was submitted. No refund has been executed.",
      });
    } catch (err) {
      toast({ title: "Failed to submit return", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setReturnSubmitting(false);
    }
  };

  const openOrderConversation = async () => {
    if (!detail || messageOpening) return;
    setMessageOpening(true);
    try {
      const response = await authorizedFetch("/.netlify/functions/conversation-get-or-create", {
        method: "POST",
        body: JSON.stringify({ orderId: detail.id }),
      });
      const payload = await response.json() as ConversationResolveResponse;
      if (!response.ok || !payload.conversationId) {
        throw new Error(payload.error || "Conversation could not be opened.");
      }
      navigate(`/inbox/${encodeURIComponent(payload.conversationId)}`);
    } catch (err) {
      toast({ title: "Could not open conversation", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setMessageOpening(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#F7F9FC] px-[var(--mob-side,16px)] pt-8 md:hidden"><div className="h-12 animate-pulse rounded-[14px] bg-[#E8EDF3]" /><div className="mt-4 h-36 animate-pulse rounded-[20px] bg-[#E8EDF3]" /><div className="mt-3 h-48 animate-pulse rounded-[20px] bg-[#E8EDF3]" /></div>;
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] px-[var(--mob-side,16px)] pt-8 text-[#0A234F] md:hidden">
        <button onClick={onBack} className="flex h-10 items-center gap-1 text-[13px] font-extrabold"><ChevronLeft className="h-5 w-5" /> Back</button>
        <div className="mt-6 rounded-[20px] border border-red-100 bg-white p-6 text-center shadow-sm"><AlertCircle className="mx-auto h-8 w-8 text-red-500" /><p className="mt-3 text-[14px] font-extrabold">{error ?? "Order unavailable"}</p></div>
        <MobileBottomNav />
      </div>
    );
  }

  const cfg = statusCfg(detail.status);
  const counterpart = mode === "sell" ? detail.buyerName ?? "Customer" : detail.sellerName ?? "Seller";
  const returnCanStart = mode === "buy" && !detail.returnRequest && ["delivered", "completed"].includes(detail.status);

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#0A234F] md:hidden">
      <header className="sticky top-0 z-30 border-b border-[#0A234F]/[0.08] bg-white/95 px-[var(--mob-side,16px)] pb-3" style={{ paddingTop: "calc(0.7rem + env(safe-area-inset-top, 0px))", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} aria-label="Back to order history" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F6F8]"><ChevronLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#C98200]">{mode === "sell" ? "Sale details" : "Order details"}</p><p className="mt-0.5 truncate font-mono text-[12px] font-bold text-[#667085]">#{detail.orderNumber}</p></div>
          <span className={`rounded-full px-2.5 py-1.5 text-[10px] font-black ${cfg.className}`}>{cfg.label}</span>
        </div>
      </header>

      <main className="space-y-3 px-[var(--mob-side,16px)] py-4" style={{ paddingBottom: "calc(92px + env(safe-area-inset-bottom, 0px))" }}>
        <section className="rounded-[20px] border border-[#0A234F]/[0.08] bg-white p-4 shadow-[0_7px_22px_rgba(10,35,79,0.05)]">
          <div className="flex gap-3.5">
            <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-[15px] bg-[#EEF2F7]">{detail.productImage ? <img src={detail.productImage} alt={detail.productTitle ?? "Product"} className="h-full w-full object-cover" /> : <Package className="h-8 w-8 text-[#A0A8B4]" />}</div>
            <div className="min-w-0 flex-1"><p className="line-clamp-3 text-[14px] font-black leading-[1.35] text-[#26354A]">{detail.productTitle ?? "Order"}</p><p className="mt-2 text-[11px] font-semibold text-[#667085]">{mode === "sell" ? "Buyer" : "Seller"}: {counterpart}</p><div className="mt-2 flex items-end justify-between gap-2"><span className="text-[18px] font-black text-[#0A234F]">£{detail.total.toFixed(2)}</span><span className="text-[10px] font-semibold text-[#7A8493]">Qty {detail.quantity}</span></div></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#0A234F]/[0.07] pt-3 text-[11px]"><div><p className="font-semibold text-[#98A2B3]">Order date</p><p className="mt-0.5 font-bold text-[#475569]">{formatDate(detail.createdAt)}</p></div><div><p className="font-semibold text-[#98A2B3]">Order status</p><p className="mt-0.5 font-bold capitalize text-[#475569]">{cfg.label}</p></div></div>
        </section>

        <section className="rounded-[20px] border border-[#0A234F]/[0.08] bg-white p-4 shadow-[0_7px_22px_rgba(10,35,79,0.05)]">
          <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-[#1D57D8]" /><h2 className="text-[14px] font-black">Delivery</h2></div>
          {detail.shipment ? (
            <>
              <div className="mt-3 rounded-[14px] bg-[#F7F9FC] p-3"><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-[#667085]">Shipment status</span><span className="text-[11px] font-extrabold capitalize text-[#0A234F]">{detail.shipment.status}</span></div>{detail.shipment.courier_name ? <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-[#667085]">Courier</span><span className="text-[11px] font-extrabold text-[#0A234F]">{detail.shipment.courier_name}</span></div> : null}{detail.shipment.tracking_number ? <div className="mt-2"><p className="text-[11px] font-semibold text-[#667085]">Tracking number</p><p className="mt-1 break-all font-mono text-[11px] font-extrabold text-[#0A234F]">{detail.shipment.tracking_number}</p></div> : null}</div>
              {detail.events.length > 0 ? <div className="mt-4"><p className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-[#7A8493]">Delivery history</p><div className="space-y-3">{detail.events.map((event, index) => <div key={event.id} className="flex gap-3"><div className="flex flex-col items-center"><span className={`mt-1 h-2.5 w-2.5 rounded-full ${index === detail.events.length - 1 ? "bg-[#F5A300]" : "bg-[#B8C1CD]"}`} />{index < detail.events.length - 1 ? <span className="mt-1 h-full min-h-7 w-px bg-[#D9DEE6]" /> : null}</div><div className="min-w-0 flex-1 pb-1"><p className="text-[11px] font-extrabold capitalize text-[#26354A]">{event.status}</p>{event.message ? <p className="mt-0.5 text-[10px] leading-[1.45] text-[#667085]">{event.message}</p> : null}<p className="mt-1 text-[9px] font-medium text-[#98A2B3]">{formatDateTime(event.created_at)}</p></div></div>)}</div></div> : null}
            </>
          ) : <div className="mt-3 rounded-[14px] bg-[#FFF8E8] p-3"><p className="text-[11px] font-extrabold text-[#795300]">Preparing for shipment</p><p className="mt-1 text-[10px] leading-[1.45] text-[#8A6A25]">Tracking information will appear here when a shipment is created.</p></div>}
        </section>

        {detail.returnRequest ? (
          <section className="rounded-[20px] border border-[#0A234F]/[0.08] bg-white p-4 shadow-[0_7px_22px_rgba(10,35,79,0.05)]"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7A8493]">Return / refund</p><div className="mt-2 flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[13px] font-extrabold capitalize text-[#26354A]">{detail.returnRequest.status}</p><p className="mt-1 text-[10px] leading-[1.45] text-[#667085]">{detail.returnRequest.reason}</p></div>{detail.returnRequest.refundAmount != null ? <span className="shrink-0 text-[13px] font-black">£{detail.returnRequest.refundAmount.toFixed(2)}</span> : null}</div></section>
        ) : returnCanStart ? (
          <section className="rounded-[20px] border border-[#0A234F]/[0.08] bg-white p-4 shadow-[0_7px_22px_rgba(10,35,79,0.05)]">
            <div className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-[#1D57D8]" /><h2 className="text-[14px] font-black">Return this order</h2></div>
            {!returnOpen ? <button type="button" onClick={() => setReturnOpen(true)} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-[14px] bg-[#0A234F] px-4 text-[12px] font-extrabold text-white">Request a return</button> : (
              <div className="mt-3 space-y-3">
                <select value={returnReason} onChange={(event) => setReturnReason(event.target.value)} className="h-12 w-full rounded-[14px] border border-[#0A234F]/10 bg-[#F7F9FC] px-3 text-[12px] font-bold text-[#26354A] outline-none"><option value="">Choose a reason</option>{RETURN_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select>
                <textarea value={returnDescription} onChange={(event) => setReturnDescription(event.target.value)} rows={4} maxLength={1000} placeholder="Tell us what happened" className="w-full resize-none rounded-[14px] border border-[#0A234F]/10 bg-[#F7F9FC] p-3 text-[12px] font-medium text-[#26354A] outline-none placeholder:text-[#98A2B3]" />
                <p className="text-[10px] leading-[1.45] text-[#667085]">Submitting a request does not execute a refund. Eligibility is checked first and manual review may be required.</p>
                <div className="flex gap-2"><button type="button" disabled={returnSubmitting} onClick={() => setReturnOpen(false)} className="min-h-11 flex-1 rounded-[13px] border border-[#0A234F]/10 bg-white text-[11px] font-extrabold text-[#475569]">Cancel</button><button type="button" disabled={returnSubmitting} onClick={() => { void submitReturn(); }} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[13px] bg-[#0A234F] text-[11px] font-extrabold text-white disabled:opacity-60">{returnSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Submit return</button></div>
              </div>
            )}
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[18px] border border-[#0A234F]/[0.08] bg-white shadow-[0_6px_22px_rgba(10,35,79,0.05)]"><button type="button" disabled={messageOpening} onClick={() => { void openOrderConversation(); }} className="flex min-h-14 w-full items-center gap-3 px-4 text-left disabled:opacity-60">{messageOpening ? <Loader2 className="h-[18px] w-[18px] animate-spin text-[#0A234F]" /> : <MessageSquare className="h-[18px] w-[18px] text-[#0A234F]" />}<span className="flex-1 text-[13px] font-extrabold text-[#26354A]">Message {mode === "sell" ? "buyer" : "seller"}</span><ChevronRight className="h-4 w-4 text-[#A0A8B4]" /></button><div className="ml-[52px] h-px bg-[#0A234F]/[0.07]" /><button onClick={() => navigate("/faq")} className="flex min-h-14 w-full items-center gap-3 px-4 text-left"><CircleHelp className="h-[18px] w-[18px] text-[#0A234F]" /><span className="flex-1 text-[13px] font-extrabold text-[#26354A]">Returns, refunds &amp; order help</span><ChevronRight className="h-4 w-4 text-[#A0A8B4]" /></button></section>
      </main>
      <MobileBottomNav />
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

  const changeMode = (nextMode: OrderMode) => {
    const next = new URLSearchParams(searchParams);
    next.set("mode", nextMode);
    next.delete("orderId");
    setActiveTab("all");
    setSearchParams(next, { replace: true });
  };

  const closeDetail = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("orderId");
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!user?.id) { promptAuth(); return; }
    const load = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { promptAuth(); return; }
        const ownerColumn = mode === "sell" ? "sellerId" : "buyerId";
        const { data, error } = await supabase.from("orders").select(`id, orderNumber, total, status, createdAt, quantity, buyerId, buyerNameSnapshot, commercialSnapshotSource, products:productId(title, images), order_items(productTitleSnapshot, productImageSnapshot, productSnapshotSource)`).eq(ownerColumn, user.id).order("createdAt", { ascending: false });
        if (error || !data) { setOrders([]); return; }

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
          const legacyBuyerIds = [...new Set(sourceRows.filter((order) => !order.commercialSnapshotSource || !order.buyerNameSnapshot?.trim()).map((order) => order.buyerId).filter((id): id is string => Boolean(id)))];
          if (legacyBuyerIds.length > 0) {
            const { data: buyers } = await supabase.from("users").select("id, firstName, lastName").in("id", legacyBuyerIds);
            (buyers as BuyerLookup[] | null)?.forEach((buyer) => { buyerNameById[buyer.id] = fullName(buyer) || "Customer"; });
          }
        }

        setOrders(sourceRows.map((order) => {
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
            buyerName: mode === "sell" ? (snapshotBuyerName || (order.buyerId ? buyerNameById[order.buyerId] : null) || "Customer") : null,
          };
        }));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user?.id, mode, promptAuth]);

  if (deepLinkOrderId) return <MobileOrderDetail orderId={deepLinkOrderId} requestedMode={mode} onBack={closeDetail} />;

  const visibleOrders = activeTab === "all" ? orders : orders.filter((order) => TAB_STATUSES[activeTab].includes(order.status));
  const hasAwaitingPayment = mode === "buy" && orders.some((order) => order.status === "awaiting_payment");

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#0A234F] md:hidden">
      <header className="sticky top-0 z-30 border-b border-[#0A234F]/[0.08] bg-white/95 px-[var(--mob-side,16px)]" style={{ paddingTop: "calc(0.9rem + env(safe-area-inset-top, 0px))", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}>
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#C98200]">{mode === "sell" ? "Sales" : "Purchases"}</p>
        <div className="flex items-end justify-between gap-3"><h1 className="mt-1 text-[22px] font-black tracking-[-0.03em] text-[#0A234F]">{mode === "sell" ? "Sold items" : "My orders"}</h1><div className="mb-0.5 flex rounded-full bg-[#EEF2F7] p-1"><button type="button" onClick={() => changeMode("buy")} className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${mode === "buy" ? "bg-[#0A234F] text-white" : "text-[#667085]"}`}>Purchases</button><button type="button" onClick={() => changeMode("sell")} className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${mode === "sell" ? "bg-[#0A234F] text-white" : "text-[#667085]"}`}>Sales</button></div></div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{TABS.map((tab) => { const active = activeTab === tab.id; return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`min-h-9 shrink-0 rounded-full px-3 text-[11px] font-extrabold ${active ? "bg-[#0A234F] text-white" : "border border-[#0A234F]/10 bg-[#F7F9FC] text-[#667085]"}`}>{tab.label}</button>; })}</div>
      </header>

      <main className="px-[var(--mob-side,16px)] py-4" style={{ paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))" }}>
        {loading ? <div className="flex flex-col gap-3">{[1, 2, 3].map((n) => <div key={n} className="h-[108px] animate-pulse rounded-[18px] bg-[#E8EDF3]" />)}</div> : visibleOrders.length === 0 ? <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#0A234F]/[0.08] bg-white px-6 py-14 text-center shadow-sm"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EEF2F7]"><Package className="h-7 w-7 text-[#94A3B8]" aria-hidden="true" /></div><p className="mt-4 text-[15px] font-extrabold text-[#0A234F]">{activeTab === "all" ? (mode === "sell" ? "No sales yet" : "No orders yet") : "Nothing in this section"}</p><p className="mt-1 text-[12px] leading-[1.45] text-[#7A8493]">{activeTab === "all" ? (mode === "sell" ? "Items sold through Loadify will appear here." : "Items you buy on Loadify will appear here.") : "Try another order status."}</p>{activeTab === "all" && mode === "buy" ? <Link to="/catalog" className="mt-5 rounded-[13px] bg-[#0A234F] px-4 py-2.5 text-[12px] font-extrabold text-white no-underline">Browse marketplace</Link> : null}</div> : <div className="flex flex-col gap-3">{visibleOrders.map((order) => <OrderCard key={order.id} order={order} mode={mode} />)}</div>}
        {!loading && hasAwaitingPayment ? <div className="mt-3 flex items-start gap-2 rounded-[14px] border border-[#F5A300]/40 bg-[#FFF8E8] p-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#C98200]" aria-hidden="true" /><p className="text-[11px] leading-relaxed text-[#795300]">You have orders awaiting payment. Open the order to complete checkout before the reservation expires.</p></div> : null}
        {!loading ? <button onClick={() => navigate("/faq")} className="mt-4 flex h-12 w-full items-center gap-2 rounded-[14px] border border-[#0A234F]/10 bg-white px-3 text-left"><CircleHelp className="h-4 w-4 shrink-0 text-[#667085]" aria-hidden="true" /><span className="flex-1 text-[12px] font-bold text-[#475569]">Need help with an order?</span><ChevronRight className="h-4 w-4 text-[#A0A8B4]" aria-hidden="true" /></button> : null}
      </main>
      <MobileBottomNav />
    </div>
  );
}
