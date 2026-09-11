import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Clock3, MapPin, Package, Truck } from "lucide-react";
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
  name?: string | null; phone?: string | null; line1?: string | null; line2?: string | null;
  city?: string | null; county?: string | null; state?: string | null;
  postcode?: string | null; postal_code?: string | null; country?: string | null; countryCode?: string | null;
}
interface ItemSnapshot {
  id: string; productId: string; quantity: number; pricePerUnit: number;
  productTitleSnapshot: string | null; productImageSnapshot: string | null; listingContextSnapshot: string | null;
}
interface OrderDetails {
  id: string; orderNumber: string; buyerNameSnapshot: string | null; buyerEmailSnapshot: string | null;
  total: number; subtotal: number | null; vatAmount: number | null; shippingAmount: number | null;
  status: string; createdAt: string; shippingAddress: Address | null; shippingMethod: string | null;
  order_items: ItemSnapshot[] | null;
}
interface ShipmentSummary {
  id: string; status: string; courier_name: string | null; tracking_number: string | null; dispatched_at: string | null;
}
const hasAddress = (a?: Address | null) => Boolean(a?.line1?.trim() && a?.city?.trim() && (a?.postcode?.trim() || a?.postal_code?.trim()));
const SellerOrderDetails = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [shipment, setShipment] = useState<ShipmentSummary | null>(null);
  const [carrier, setCarrier] = useState("Royal Mail");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");

  const load = async () => {
    if (!user?.id || !orderId) return;
    setLoading(true); setError("");
    const { data, error: orderError } = await supabase.from("orders")
      .select("id, orderNumber, buyerNameSnapshot, buyerEmailSnapshot, total, subtotal, vatAmount, shippingAmount, status, createdAt, shippingAddress, shippingMethod, order_items(id, productId, quantity, pricePerUnit, productTitleSnapshot, productImageSnapshot, listingContextSnapshot)")
      .eq("id", orderId).eq("sellerId", user.id).maybeSingle();
    if (orderError || !data) { setError("Order not found or you do not have access to it."); setLoading(false); return; }
    setOrder(data as unknown as OrderDetails);
    const { data: shipmentData } = await supabase.from("shipments")
      .select("id, status, courier_name, tracking_number, dispatched_at")
      .eq("order_id", orderId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const current = (shipmentData as ShipmentSummary | null) ?? null;
    setShipment(current); setCarrier(current?.courier_name === "Evri" ? "Evri" : "Royal Mail");
    setTrackingNumber(current?.tracking_number ?? ""); setLoading(false);
  };

  useEffect(() => { void load(); }, [orderId, user?.id]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  const isDispatched = Boolean(shipment?.dispatched_at || ["Dispatched", "In Transit", "Out for Delivery", "Delivered"].includes(shipment?.status ?? ""));
  const deadline = useMemo(() => order ? new Date(new Date(order.createdAt).getTime() + 48 * 60 * 60 * 1000) : null, [order]);
  const deadlineLabel = useMemo(() => {
    if (!deadline) return "Unavailable";
    if (isDispatched) return "SLA completed";
    const diff = deadline.getTime() - now;
    if (diff <= 0) return "48h target exceeded";
    const h = Math.floor(diff / 3_600_000); const m = Math.floor((diff % 3_600_000) / 60_000);
    return `${h}h ${m}m remaining`;
  }, [deadline, isDispatched, now]);

  const dispatch = async () => {
    if (!order || !hasAddress(order.shippingAddress)) {
      toast({ title: "Delivery address missing", description: "Do not dispatch this order until a valid delivery snapshot is present.", variant: "destructive" }); return;
    }
    if (!trackingNumber.trim()) {
      toast({ title: "Tracking required", description: "Enter an official Royal Mail or Evri tracking number.", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const res = await authorizedFetch("/.netlify/functions/create-shipment", { method: "POST", body: JSON.stringify({ order_id: order.id, courier_name: carrier, tracking_number: trackingNumber.trim(), dispatched_at: new Date().toISOString() }) });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Unable to dispatch shipment");
      toast({ title: "Shipment dispatched", description: "Tracking was saved and the buyer can be notified by the shipment workflow." });
      await load();
    } catch (err) { toast({ title: "Dispatch failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading order...</div>;
  if (error || !order) return <div className="p-6"><Button variant="ghost" onClick={() => navigate("/seller/orders")}><ArrowLeft className="mr-2 h-4 w-4" />Back to orders</Button><p className="mt-4 text-sm text-destructive">{error || "Order unavailable"}</p></div>;

  const a = order.shippingAddress; const items = order.order_items ?? [];
  return <div className="max-w-[1100px] space-y-5 p-4 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div><Button variant="ghost" size="sm" onClick={() => navigate("/seller/orders")}><ArrowLeft className="mr-1.5 h-4 w-4" />Orders</Button><h1 className="mt-2 text-2xl font-bold">{order.orderNumber}</h1><p className="text-sm text-muted-foreground">Placed {new Date(order.createdAt).toLocaleString("en-GB")}</p></div><Badge variant="outline" className="capitalize">{order.status}</Badge></div>
    <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /><div><p className="text-xs text-muted-foreground">Tracking target</p><p className={`font-semibold ${deadlineLabel.includes("exceeded") ? "text-red-600" : ""}`}>{deadlineLabel}</p></div></div><div className="text-xs text-muted-foreground">48h operational target from order creation</div></CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-3"><div className="space-y-4 lg:col-span-2">
      <Card><CardContent className={`p-5 ${hasAddress(a) ? "" : "border border-red-200 bg-red-50"}`}><div className="mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><h2 className="font-semibold">Ship to</h2></div>{hasAddress(a) ? <div className="text-sm leading-6"><p className="font-semibold">{a?.name || order.buyerNameSnapshot || "Customer"}</p>{a?.phone ? <p>Phone: {a.phone}</p> : null}<p>{a?.line1}</p>{a?.line2 ? <p>{a.line2}</p> : null}<p>{[a?.city, a?.county ?? a?.state].filter(Boolean).join(", ")}</p><p className="font-semibold">{a?.postcode ?? a?.postal_code}</p><p>{a?.countryCode === "GB" || a?.country === "GB" ? "United Kingdom" : a?.country}</p><p className="mt-2 text-xs text-muted-foreground">Delivery method: <strong className="text-foreground">{order.shippingMethod || "Standard"}</strong></p></div> : <div className="flex gap-2 text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4" /><div><p className="font-semibold">Delivery address missing</p><p className="text-sm">Do not dispatch. Shipment actions are blocked until a valid order snapshot exists.</p></div></div>}</CardContent></Card>
      <Card><CardContent className="p-5"><div className="mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-primary" /><h2 className="font-semibold">Items ordered</h2></div><div className="divide-y divide-border">{items.map(item => <div key={item.id} className="flex items-center gap-3 py-3"><div className="h-14 w-14 overflow-hidden rounded bg-muted">{item.productImageSnapshot ? <img src={item.productImageSnapshot} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0 flex-1"><p className="font-medium">{item.productTitleSnapshot || "Order item"}</p><p className="text-xs text-muted-foreground">Qty {item.quantity}</p></div><p className="font-semibold">£{(Number(item.pricePerUnit || 0) * item.quantity).toFixed(2)}</p></div>)}</div></CardContent></Card>
    </div><div className="space-y-4">
      <Card><CardContent className="p-5"><div className="mb-3 flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /><h2 className="font-semibold">Logistics desk</h2></div>{isDispatched ? <div className="space-y-2 text-sm"><p>Status: <strong>{shipment?.status}</strong></p><p>Carrier: <strong>{shipment?.courier_name || "-"}</strong></p><p>Tracking: <strong>{shipment?.tracking_number || "-"}</strong></p><Button variant="outline" className="w-full" onClick={() => navigate("/seller/shipments")}>Manage / correct shipment</Button></div> : <div className="space-y-3"><div><Label>Carrier</Label><Select value={carrier} onValueChange={setCarrier}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Royal Mail">Royal Mail</SelectItem><SelectItem value="Evri">Evri</SelectItem></SelectContent></Select></div><div><Label>Tracking ID</Label><Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Official tracking code" /></div><Button className="w-full" disabled={!hasAddress(a) || !trackingNumber.trim() || saving} onClick={() => void dispatch()}>{saving ? "Saving..." : "Confirm shipment & dispatch"}</Button></div>}</CardContent></Card>
      <Card><CardContent className="space-y-2 p-5 text-sm"><h2 className="font-semibold">Order total</h2><div className="flex justify-between"><span>Subtotal</span><span>£{Number(order.subtotal || 0).toFixed(2)}</span></div><div className="flex justify-between"><span>Shipping</span><span>£{Number(order.shippingAmount || 0).toFixed(2)}</span></div><div className="flex justify-between"><span>VAT</span><span>£{Number(order.vatAmount || 0).toFixed(2)}</span></div><div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span>£{Number(order.total || 0).toFixed(2)}</span></div></CardContent></Card>
    </div></div>
  </div>;
};

export default SellerOrderDetails;
