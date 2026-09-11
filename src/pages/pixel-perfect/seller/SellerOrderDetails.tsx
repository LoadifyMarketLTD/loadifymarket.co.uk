import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Clock3, Copy, History, MapPin, MessageSquare, Package, RefreshCw, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { toast } from "@/hooks/use-toast";

interface Address {
  name?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  county?: string | null;
  state?: string | null;
  postcode?: string | null;
  postal_code?: string | null;
  country?: string | null;
  countryCode?: string | null;
}
interface OrderItemSnapshot {
  id: string;
  productId: string;
  quantity: number;
  pricePerUnit: number;
  productTitleSnapshot: string | null;
  productImageSnapshot: string | null;
  listingContextSnapshot: string | null;
}

interface OrderDetails {
  id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  buyerNameSnapshot: string | null;
  buyerEmailSnapshot: string | null;
  total: number;
  subtotal: number | null;
  vatAmount: number | null;
  shippingAmount: number | null;
  status: string;
  createdAt: string;
  shippingAddress: Address | null;
  shippingMethod: string | null;
  escrowStatus?: string | null;
  order_items: OrderItemSnapshot[] | null;
}

interface ShipmentSummary {
  id: string;
  status: string;
  courier_name: string | null;
  tracking_number: string | null;
  dispatched_at: string | null;
  created_at: string;
}

interface OrderLifecycleSummary {
  paidAt: string | null;
  returnStatus: string | null;
  disputeStatus: string | null;
  payoutStatus: string | null;
}

interface ShipmentEvent {
  id: string;
  status: string;
  message: string | null;
  source: string;
  created_at: string;
}
const hasAddress = (address?: Address | null) => Boolean(
  address?.line1?.trim()
  && address?.city?.trim()
  && (address?.postcode?.trim() || address?.postal_code?.trim()),
);

const dispatchedStatuses = new Set(["Dispatched", "In Transit", "Out for Delivery", "Delivered"]);

export default function SellerOrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [shipment, setShipment] = useState<ShipmentSummary | null>(null);
  const [shipmentEvents, setShipmentEvents] = useState<ShipmentEvent[]>([]);
  const [lifecycle, setLifecycle] = useState<OrderLifecycleSummary>({ paidAt: null, returnStatus: null, disputeStatus: null, payoutStatus: null });
  const [carrier, setCarrier] = useState("Royal Mail");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [messageOpening, setMessageOpening] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    if (!user?.id || !orderId) return;
    setLoading(true);
    setError("");
    const { data, error: orderError } = await supabase
      .from("orders")
      .select("id, orderNumber, buyerId, sellerId, buyerNameSnapshot, buyerEmailSnapshot, total, subtotal, vatAmount, shippingAmount, status, createdAt, shippingAddress, shippingMethod, escrowStatus, order_items(id, productId, quantity, pricePerUnit, productTitleSnapshot, productImageSnapshot, listingContextSnapshot)")
      .eq("id", orderId)
      .eq("sellerId", user.id)
      .maybeSingle();
    if (orderError || !data) {
      setError("Order not found or you do not have access to it.");
      setLoading(false);
      return;
    }
    setOrder(data as unknown as OrderDetails);

    const [{ data: paymentRow }, { data: returnRow }, { data: disputeRow }, { data: payoutRow }] = await Promise.all([
      supabase.from("payment_sessions").select("status, updatedAt").eq("orderId", orderId).eq("status", "completed").order("updatedAt", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("returns").select("status").eq("orderId", orderId).order("updatedAt", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("disputes").select("status").eq("orderId", orderId).order("updatedAt", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("payouts").select("status").eq("orderId", orderId).order("updatedAt", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setLifecycle({
      paidAt: (paymentRow as { updatedAt?: string } | null)?.updatedAt ?? (data.status !== "pending" ? data.createdAt : null),
      returnStatus: (returnRow as { status?: string } | null)?.status ?? null,
      disputeStatus: (disputeRow as { status?: string } | null)?.status ?? null,
      payoutStatus: (payoutRow as { status?: string } | null)?.status ?? null,
    });

    const { data: shipmentData } = await supabase
      .from("shipments")
      .select("id, status, courier_name, tracking_number, dispatched_at, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const current = (shipmentData as ShipmentSummary | null) ?? null;
    setShipment(current);
    setCarrier(current?.courier_name === "Evri" ? "Evri" : "Royal Mail");
    setTrackingNumber(current?.tracking_number ?? "");

    if (current?.id) {
      const { data: eventRows } = await supabase
        .from("shipment_events")
        .select("id, status, message, source, created_at")
        .eq("shipment_id", current.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setShipmentEvents((eventRows as ShipmentEvent[] | null) ?? []);
    } else {
      setShipmentEvents([]);
    }
    setLoading(false);
  }, [orderId, user?.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const isDispatched = Boolean(shipment?.dispatched_at || dispatchedStatuses.has(shipment?.status ?? ""));
  const trackingDeadline = useMemo(
    () => order ? new Date(new Date(order.createdAt).getTime() + 48 * 60 * 60 * 1000) : null,
    [order],
  );
  const deadlineLabel = useMemo(() => {
    if (!trackingDeadline) return "Unavailable";
    if (isDispatched) return "SLA completed";
    const diff = trackingDeadline.getTime() - now;
    if (diff <= 0) return "SLA BREACHED";
    const hours = Math.floor(diff / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    return `${hours}h ${minutes}m remaining`;
  }, [trackingDeadline, isDispatched, now]);

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", description: "Your browser did not allow clipboard access.", variant: "destructive" });
    }
  };

  const openBuyerConversation = async () => {
    if (!order || messageOpening) return;
    setMessageOpening(true);
    try {
      const response = await authorizedFetch("/.netlify/functions/conversation-get-or-create", {
        method: "POST",
        body: JSON.stringify({ orderId: order.id }),
      });
      const payload = await response.json() as { conversationId?: string; error?: string };
      if (!response.ok || !payload.conversationId) {
        throw new Error(payload.error ?? "Could not open the buyer conversation");
      }
      navigate(`/seller/messages?conversationId=${encodeURIComponent(payload.conversationId)}`);
    } catch (err) {
      toast({ title: "Could not open buyer conversation", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setMessageOpening(false);
    }
  };

  const dispatchShipment = async () => {
    if (!order || busy) return;
    if (!hasAddress(order.shippingAddress)) {
      toast({ title: "Delivery address missing", description: "Do not dispatch this physical order until a valid delivery snapshot exists.", variant: "destructive" });
      return;
    }
    if (!trackingNumber.trim()) {
      toast({ title: "Tracking number required", description: "Enter the Royal Mail or Evri tracking number first.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const response = await authorizedFetch("/.netlify/functions/create-shipment", {
        method: "POST",
        body: JSON.stringify({ order_id: order.id, courier_name: carrier, tracking_number: trackingNumber.trim(), dispatched_at: new Date().toISOString() }),
      });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Failed to dispatch shipment");
      toast({ title: "Shipment dispatched", description: "The buyer tracking status has been updated." });
      await load();
    } catch (err) {
      toast({ title: "Dispatch failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  const undoDispatch = async () => {
    if (!shipment || shipment.status !== "Dispatched" || busy) return;
    if (!window.confirm("Correct accidental dispatch? Use this only if the parcel has not actually been handed to the courier.")) return;
    setBusy(true);
    try {
      const response = await authorizedFetch(`/.netlify/functions/update-shipment-status/${shipment.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ correction: "undo_dispatch", message: "Dispatch corrected by seller: parcel was not handed to the courier" }),
      });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Failed to correct dispatch");
      toast({ title: "Dispatch corrected", description: "The order returned to Processing and the buyer was notified." });
      await load();
    } catch (err) {
      toast({ title: "Correction failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading order...</div>;
  if (error || !order) return (
    <div className="p-6">
      <Button variant="ghost" onClick={() => navigate("/seller/orders")}><ArrowLeft className="mr-2 h-4 w-4" />Back to orders</Button>
      <p className="mt-4 text-sm text-destructive">{error || "Order unavailable"}</p>
    </div>
  );

  const address = order.shippingAddress;
  const items = order.order_items ?? [];
  const recipient = address?.name?.trim() || order.buyerNameSnapshot || "Customer";
  const phone = address?.phone?.trim() || address?.phoneNumber?.trim() || null;
  return <div className="max-w-[1180px] space-y-5 p-4 sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/seller/orders")}><ArrowLeft className="mr-1.5 h-4 w-4" />Orders</Button>
        <h1 className="mt-2 text-2xl font-bold">{order.orderNumber}</h1>
        <p className="text-sm text-muted-foreground">Placed {new Date(order.createdAt).toLocaleString("en-GB")}</p>
        {lifecycle.paidAt ? <p className="text-sm text-muted-foreground">Paid {new Date(lifecycle.paidAt).toLocaleString("en-GB")}</p> : null}
      </div>
      <Badge variant="outline" className="w-fit capitalize">{order.status}</Badge>
    </div>

    <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operational status</p><p className="mt-1 font-semibold">{isDispatched ? "Dispatched" : "Processing / ready to ship"}</p></div>
      <div className="rounded-lg bg-slate-950 px-4 py-3 text-white">
        <div className="flex items-center gap-2 text-xs text-slate-300"><Clock3 className="h-4 w-4" />Tracking SLA (48h)</div>
        <p className={`mt-1 font-mono text-sm font-bold ${deadlineLabel === "SLA BREACHED" ? "text-red-400" : "text-emerald-400"}`}>{deadlineLabel}</p>{trackingDeadline && !isDispatched ? <p className="mt-1 text-[11px] text-slate-300">Dispatch by {trackingDeadline.toLocaleString("en-GB")}</p> : null}
      </div>
    </CardContent></Card>

    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card><CardContent className={`p-5 ${hasAddress(address) ? "" : "border border-red-200 bg-red-50"}`}>
          <div className="mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><h2 className="font-semibold">Buyer & Ship to</h2></div>
          {hasAddress(address) ? <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-sm leading-6">
              <p className="font-semibold">{recipient}</p>
              {order.buyerEmailSnapshot ? <p className="break-all text-xs text-muted-foreground">{order.buyerEmailSnapshot}</p> : null}
              {phone ? <p>Phone: {phone}</p> : <p className="text-xs text-muted-foreground">No courier phone stored on this order.</p>}
              <Button variant="outline" size="sm" className="mt-3" disabled={messageOpening} onClick={() => void openBuyerConversation()}>{messageOpening ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}Message buyer</Button>
            </div>
            <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm leading-6">
              <p>{address?.line1}</p>
              {address?.line2 ? <p>{address.line2}</p> : null}
              <p>{[address?.city, address?.county ?? address?.state].filter(Boolean).join(", ")}</p>
              <p className="font-semibold">{address?.postcode ?? address?.postal_code}</p>
              <p>{address?.countryCode === "GB" || address?.country === "GB" ? "United Kingdom" : address?.country}</p>
              {order.shippingMethod ? <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">Delivery method: <strong className="text-foreground">{order.shippingMethod}</strong></p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => void copyText("Address", [address?.name || recipient, address?.line1, address?.line2, [address?.city, address?.county ?? address?.state].filter(Boolean).join(", "), address?.postcode ?? address?.postal_code, address?.countryCode === "GB" || address?.country === "GB" ? "United Kingdom" : address?.country].filter(Boolean).join("\n"))}><Copy className="mr-2 h-3.5 w-3.5" />Copy address</Button>
                <Button variant="outline" size="sm" onClick={() => void copyText("Postcode", String(address?.postcode ?? address?.postal_code ?? ""))}><Copy className="mr-2 h-3.5 w-3.5" />Copy postcode</Button>
              </div>
            </div>
          </div> : <div className="flex gap-2 text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">Delivery address missing</p><p className="text-sm">Do not dispatch this physical order until a valid order delivery snapshot exists.</p></div></div>}
        </CardContent></Card>

        <Card><CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2"><Package className="h-4 w-4 text-primary" /><h2 className="font-semibold">Items ordered</h2></div>
          <div className="divide-y divide-border">
            {items.length === 0 ? <p className="text-sm text-muted-foreground">No order-item snapshot is available.</p> : items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.productImageSnapshot ? <img src={item.productImageSnapshot} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.productTitleSnapshot || "Order item"}</p>
                  <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                </div>
                <div className="text-right"><p className="text-sm font-semibold">£{(Number(item.pricePerUnit || 0) * item.quantity).toFixed(2)}</p><p className="text-xs text-muted-foreground">£{Number(item.pricePerUnit || 0).toFixed(2)} each</p></div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 border-t pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>£{Number(order.subtotal || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">VAT</span><span>£{Number(order.vatAmount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>£{Number(order.shippingAmount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span>£{Number(order.total || 0).toFixed(2)}</span></div>
          </div>
        </CardContent></Card>
      </div>

      <div className="space-y-5">
        <Card><CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /><h2 className="font-semibold">Shipment management</h2></div>
          <div className="mb-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-2">
            <div className="rounded-lg border p-2"><span className="text-muted-foreground">Return</span><p className="mt-1 font-semibold capitalize">{lifecycle.returnStatus ?? "None"}</p></div>
            <div className="rounded-lg border p-2"><span className="text-muted-foreground">Dispute</span><p className="mt-1 font-semibold capitalize">{lifecycle.disputeStatus ?? "None"}</p></div>
            <div className="rounded-lg border p-2"><span className="text-muted-foreground">Payout</span><p className="mt-1 font-semibold capitalize">{lifecycle.payoutStatus ?? (order.escrowStatus === "released" ? "Released" : "Pending")}</p></div>
            <div className="rounded-lg border p-2"><span className="text-muted-foreground">Escrow</span><p className="mt-1 font-semibold capitalize">{order.escrowStatus ?? "Held"}</p></div>
          </div>
          {shipment ? <div className="mb-4 space-y-1 rounded-lg border bg-muted/30 p-3 text-sm"><p>Status: <strong>{shipment.status}</strong></p><p>Carrier: <strong>{shipment.courier_name || "—"}</strong></p><p>Tracking: <strong>{shipment.tracking_number || "—"}</strong></p>{shipment.dispatched_at ? <p>Dispatched: <strong>{new Date(shipment.dispatched_at).toLocaleString("en-GB")}</strong></p> : null}</div> : null}
          {!isDispatched ? <div className="space-y-4">
            {shipment ? <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900"><p className="font-semibold">Existing shipment</p><p>Update carrier or tracking below. This order keeps the same shipment record; a second shipment will not be created.</p></div> : null}
            <div><Label className="text-xs">Approved carrier</Label><Select value={carrier} onValueChange={setCarrier}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Royal Mail">Royal Mail</SelectItem><SelectItem value="Evri">Evri</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Tracking number</Label><Input className="mt-1" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Enter official tracking code" /></div>
            <Button className="w-full" disabled={busy || !hasAddress(address) || !trackingNumber.trim()} onClick={() => void dispatchShipment()}>{busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}{shipment ? "Update details & dispatch" : "Confirm shipment & dispatch"}</Button>
            {!hasAddress(address) ? <p className="text-xs font-semibold text-red-600">Dispatch blocked: delivery address missing.</p> : null}
          </div> : null}
          {shipment?.status === "Dispatched" ? <Button variant="outline" className="w-full border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" disabled={busy} onClick={() => void undoDispatch()}><RefreshCw className="mr-2 h-4 w-4" />Correct accidental dispatch</Button> : null}
          {isDispatched && shipment?.status !== "Dispatched" ? <Button variant="outline" className="w-full" onClick={() => navigate("/seller/shipments")}>Open shipment history</Button> : null}
          {shipment ? <div className="mt-5 border-t pt-4">
            <div className="mb-3 flex items-center gap-2"><History className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Shipment history</h3></div>
            {shipmentEvents.length === 0 ? <p className="text-xs text-muted-foreground">No shipment events recorded yet.</p> : <div className="space-y-3">{shipmentEvents.map((event) => <div key={event.id} className="border-l-2 border-muted pl-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold">{event.status}</p><span className="text-[11px] text-muted-foreground">{new Date(event.created_at).toLocaleString("en-GB")}</span></div>{event.message ? <p className="mt-0.5 text-xs text-muted-foreground">{event.message}</p> : null}<p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{event.source.replace("_", " ")}</p></div>)}</div>}
          </div> : null}
        </CardContent></Card>
      </div>
    </div>
  </div>;
}
