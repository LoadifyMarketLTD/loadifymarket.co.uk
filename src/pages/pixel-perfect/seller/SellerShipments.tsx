import { useState, useEffect, useCallback } from "react";
import { Truck, Search, Clock, Plus, Loader2, RefreshCw, ExternalLink, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";
import type { Shipment } from "@/types/shipping";
import type { User } from "@/types";
import { authorizedFetch } from "@/lib/authorizedFetch";

type BuyerData = Pick<User, "id" | "firstName" | "lastName">;

interface DeliveryAddress {
  line1?: string | null; line2?: string | null; city?: string | null;
  county?: string | null; state?: string | null; postcode?: string | null; postal_code?: string | null;
  country?: string | null; countryCode?: string | null;
}

const hasDeliveryAddress = (address?: DeliveryAddress | null) => Boolean(address && (address.line1 || address.city || address.postcode || address.postal_code));

interface ShipmentRow extends Shipment {
  orders?: {
    orderNumber?: string;
    shippingAddress?: DeliveryAddress | null;
    shippingMethod?: string | null;
    products?: { title?: string; listingContext?: string | null } | null;
  } | null;
}

function mapStatus(status: string): string {
  const s = status.toLowerCase().replace(/ /g, "_");
  if (s === "dispatched" || s === "in_transit") return "in_transit";
  if (s === "out_for_delivery") return "out_for_delivery";
  if (s === "delivered") return "delivered";
  if (s === "pending" || s === "processing") return "label_created";
  if (s === "picked_up") return "picked_up";
  return "label_created";
}

const statusConfig: Record<string, { label: string; className: string }> = {
  label_created: { label: "Label Created", className: "bg-muted text-muted-foreground" },
  picked_up: { label: "Picked Up", className: "bg-blue-500/10 text-blue-700" },
  in_transit: { label: "In Transit", className: "bg-purple-500/10 text-purple-700" },
  out_for_delivery: { label: "Out for Delivery", className: "bg-primary/10 text-primary" },
  delivered: { label: "Delivered", className: "bg-success/10 text-success" },
};

const SellerShipments = () => {
  const { user } = useAuthStore();
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [buyerNames, setBuyerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ShipmentRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sellerOrders, setSellerOrders] = useState<{ id: string; orderNumber: string; status: string; shippingAddress: DeliveryAddress | null; listingContext: string | null }[]>([]);
  const [createForm, setCreateForm] = useState({ orderId: "", courierName: "Royal Mail", trackingNumber: "", dispatchedAt: "" });
  const [creating, setCreating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [correctingDispatch, setCorrectingDispatch] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [uploadingPod, setUploadingPod] = useState(false);
  const [openingPod, setOpeningPod] = useState(false);

  const loadShipments = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("shipments")
        .select(`*, orders!shipments_order_id_fkey(orderNumber, shippingAddress, shippingMethod, products!orders_productId_fkey(title, listingContext))`)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as ShipmentRow[];
      setShipments(rows);

      const uniqueBuyerIds = [...new Set(rows.map((s) => s.buyer_id).filter(Boolean))];
      if (uniqueBuyerIds.length > 0) {
        const { data: buyers, error: buyersError } = await supabase
          .from("users")
          .select("id, firstName, lastName")
          .in("id", uniqueBuyerIds);
        if (buyersError) throw buyersError;

        const names: Record<string, string> = {};
        (buyers ?? []).forEach((buyer: BuyerData) => {
          const name = [buyer.firstName, buyer.lastName].filter(Boolean).join(" ").trim();
          names[buyer.id] = name || "Customer";
        });
        setBuyerNames(names);
      }
    } catch (err) {
      console.error("Failed to load seller shipments:", err);
      setShipments([]);
      setBuyerNames({});
      toast({
        title: "Could not load shipments",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void loadShipments(); }, [loadShipments]);

  const handleOpenCreate = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("id, orderNumber, status, shippingAddress, products:productId(listingContext)")
      .eq("sellerId", user.id)
      .in("status", ["paid", "packed", "shipped"])
      .order("createdAt", { ascending: false });
    const rows = (data ?? []) as unknown as Array<{ id: string; orderNumber: string; status: string; shippingAddress: DeliveryAddress | null; products: { listingContext?: string | null } | null }>;
    setSellerOrders(rows.map((row) => ({ id: row.id, orderNumber: row.orderNumber, status: row.status, shippingAddress: row.shippingAddress ?? null, listingContext: row.products?.listingContext ?? null })));
    setCreateForm({ orderId: "", courierName: "Royal Mail", trackingNumber: "", dispatchedAt: "" });
    setCreateOpen(true);
  };

  const handleCreateShipment = async () => {
    if (!createForm.orderId) return;
    const selectedOrder = sellerOrders.find((order) => order.id === createForm.orderId);
    if (createForm.dispatchedAt && selectedOrder?.listingContext !== "service") {
      if (!hasDeliveryAddress(selectedOrder?.shippingAddress)) {
        toast({ title: "Delivery address missing", description: "This physical order cannot be dispatched until the buyer delivery address is present on the order.", variant: "destructive" });
        return;
      }
      if (!createForm.trackingNumber.trim()) {
        toast({ title: "Tracking number required", description: "Enter the Royal Mail or Evri tracking number before marking this physical order as dispatched.", variant: "destructive" });
        return;
      }
    }
    setCreating(true);
    try {
      const payload: Record<string, unknown> = { order_id: createForm.orderId };
      if (createForm.courierName.trim()) payload.courier_name = createForm.courierName.trim();
      if (createForm.trackingNumber.trim()) payload.tracking_number = createForm.trackingNumber.trim();
      if (createForm.dispatchedAt) payload.dispatched_at = new Date(createForm.dispatchedAt).toISOString();

      const res = await authorizedFetch("/.netlify/functions/create-shipment", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to create shipment");
      toast({ title: "Shipment created", description: "The shipment has been logged successfully." });
      setCreateOpen(false);
      await loadShipments();
    } catch (err) {
      toast({ title: "Failed to create shipment", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleUploadProofOfDelivery = async (shipmentId: string, file: File) => {
    setUploadingPod(true);
    try {
      const initRes = await authorizedFetch(
        `/.netlify/functions/upload-proof-of-delivery/${shipmentId}/proof`,
        {
          method: "POST",
          body: JSON.stringify({ contentType: file.type, fileSize: file.size }),
        },
      );
      const initJson = await initRes.json() as { uploadUrl?: string; path?: string; error?: string };
      if (!initRes.ok) throw new Error(initJson.error ?? "Failed to request upload URL");
      if (!initJson.uploadUrl || !initJson.path) throw new Error("Invalid server response: missing upload URL");

      const uploadRes = await fetch(initJson.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("File upload to storage failed");

      const confirmRes = await authorizedFetch(
        `/.netlify/functions/upload-proof-of-delivery/${shipmentId}/proof`,
        { method: "PUT", body: JSON.stringify({ filePath: initJson.path }) },
      );
      const confirmJson = await confirmRes.json() as { error?: string; shipment?: ShipmentRow };
      if (!confirmRes.ok) throw new Error(confirmJson.error ?? "Failed to confirm upload");

      toast({ title: "Proof of delivery uploaded" });
      await loadShipments();
      if (confirmJson.shipment) setSelected(confirmJson.shipment);
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setUploadingPod(false);
    }
  };

  const handleViewProofOfDelivery = async (shipmentId: string) => {
    setOpeningPod(true);
    try {
      const res = await authorizedFetch(
        `/.netlify/functions/upload-proof-of-delivery/${shipmentId}/proof`,
        { method: "GET" },
      );
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Unable to open proof of delivery");
      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast({ title: "Unable to open proof", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setOpeningPod(false);
    }
  };

  const handleUpdateStatus = async (shipment: ShipmentRow, newStatus: string) => {
    if (!newStatus || newStatus === shipment.status) return;
    setUpdatingStatus(true);
    try {
      const res = await authorizedFetch(`/.netlify/functions/update-shipment-status/${shipment.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to update status");

      // The backend owns buyer email/in-app notification delivery. Keeping the
      // notification write server-side avoids duplicate events and RLS failures
      // from a seller attempting to insert a notification for another user.
      toast({ title: "Status updated", description: `Shipment marked as ${newStatus}.` });
      setPendingStatus("");
      setSelected(null);
      await loadShipments();
    } catch (err) {
      toast({ title: "Failed to update status", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCorrectDispatch = async (shipment: ShipmentRow) => {
    if (shipment.status !== "Dispatched" || correctingDispatch) return;
    const confirmed = window.confirm("Correct accidental dispatch? Use this only if the parcel has not actually been handed to the courier. The buyer will be notified and the correction will remain in history.");
    if (!confirmed) return;

    setCorrectingDispatch(true);
    try {
      const res = await authorizedFetch(`/.netlify/functions/update-shipment-status/${shipment.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ correction: "undo_dispatch", message: "Dispatch corrected by seller: parcel was not handed to the courier" }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to correct dispatch");
      toast({ title: "Dispatch corrected", description: "Shipment returned to Processing and buyer was notified." });
      setPendingStatus("");
      setSelected(null);
      await loadShipments();
    } catch (err) {
      toast({ title: "Failed to correct dispatch", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setCorrectingDispatch(false);
    }
  };

  const handlePrintLabel = (shipment: ShipmentRow) => {
    const a = shipment.orders?.shippingAddress;
    if (!hasDeliveryAddress(a)) { toast({ title: "Cannot print label", description: "Delivery address is missing.", variant: "destructive" }); return; }
    const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch] ?? ch));
    const lines = [buyerNames[shipment.buyer_id] ?? "Customer", a?.line1, a?.line2, a?.city, a?.county ?? a?.state, a?.postcode ?? a?.postal_code, a?.countryCode === "GB" ? "United Kingdom" : a?.country].filter(Boolean).map(esc);
    const html = `<!doctype html><html><head><title>Shipping label ${esc(shipment.orders?.orderNumber)}</title><style>@page{size:100mm 150mm;margin:8mm}body{font:16px Arial,sans-serif;color:#111}.box{border:2px solid #111;padding:18px}.brand{font-weight:800;font-size:20px}.to{font-size:12px;margin-top:18px;text-transform:uppercase}.address{font-size:20px;line-height:1.45;margin-top:6px}.meta{margin-top:22px;border-top:1px solid #999;padding-top:10px;font-size:12px}.note{margin-top:12px;font-size:10px;color:#555}@media print{button{display:none}}</style></head><body><div class="box"><div class="brand">Loadify Market</div><div class="to">Ship to</div><div class="address">${lines.join("<br>")}</div><div class="meta"><b>Order:</b> ${esc(shipment.orders?.orderNumber ?? shipment.order_id)}<br><b>Carrier:</b> ${esc(shipment.courier_name ?? shipment.orders?.shippingMethod ?? "")}${shipment.tracking_number ? `<br><b>Tracking:</b> ${esc(shipment.tracking_number)}` : ""}</div><div class="note">Dispatch address label only. Carrier postage must be purchased separately.</div></div><script>window.onload=()=>window.print()</script></body></html>`;
    const blob = new Blob([html], { type: "text/html" }); const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "noopener,noreferrer"); if (!win) toast({ title:"Pop-up blocked", description:"Allow pop-ups to print the shipping label.", variant:"destructive" });
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const filtered = shipments.filter((s) => {
    const q = search.toLowerCase();
    return s.id.toLowerCase().includes(q)
      || (s.tracking_number ?? "").toLowerCase().includes(q)
      || (s.orders?.orderNumber ?? "").toLowerCase().includes(q);
  });
  const byStatus = (status: string) => filtered.filter((s) => mapStatus(s.status) === status);
  const activeShipments = filtered.filter((s) => mapStatus(s.status) !== "delivered");

  const renderList = (data: ShipmentRow[]) => {
    if (loading) return <div className="px-3 py-6 text-center text-muted-foreground text-xs">Loading shipments…</div>;
    if (data.length === 0) return (
      <div className="px-3 py-6 text-center text-muted-foreground text-xs">
        <Truck className="h-6 w-6 mx-auto mb-1.5 opacity-40" />No shipments found.
      </div>
    );
    return (
      <div className="divide-y divide-border">
        {data.map((s) => {
          const sc = statusConfig[mapStatus(s.status)];
          return (
            <button key={s.id} onClick={() => setSelected(s)} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><Truck className="h-4 w-4 text-muted-foreground" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-foreground">{s.orders?.orderNumber ?? s.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${sc.className}`}>{sc.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{buyerNames[s.buyer_id] ?? "Customer"}{s.courier_name ? ` · ${s.courier_name}` : ""}</p>
              </div>
              <div className="text-right shrink-0"><div className="text-[11px] text-muted-foreground">{s.tracking_number ? s.tracking_number.slice(0, 12) : "—"}</div></div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="px-3 pt-3 pb-4 sm:p-6 space-y-3 sm:space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div><h1 className="text-base font-bold text-foreground">Shipments</h1><p className="text-[11px] text-muted-foreground">{loading ? "Loading…" : `${shipments.length} total · ${activeShipments.length} active`}</p></div>
        <Button size="sm" className="h-9 text-xs" onClick={handleOpenCreate}><Plus className="mr-1.5 h-3.5 w-3.5" /> Log Shipment</Button>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Created", count: byStatus("label_created").length, color: "text-muted-foreground" },
          { label: "In Transit", count: filtered.filter((s) => ["picked_up", "in_transit"].includes(mapStatus(s.status))).length, color: "text-purple-500" },
          { label: "Out for Del.", count: byStatus("out_for_delivery").length, color: "text-primary" },
          { label: "Delivered", count: byStatus("delivered").length, color: "text-emerald-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-lg border border-border p-2 text-center"><div className={`text-lg font-bold ${stat.color}`}>{stat.count}</div><p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{stat.label}</p></div>
        ))}
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search shipments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" /></div>

      <Tabs defaultValue="all">
        <TabsList className="h-8">
          <TabsTrigger value="all" className="text-xs h-7">All <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="active" className="text-xs h-7">Active</TabsTrigger>
          <TabsTrigger value="delivered" className="text-xs h-7">Delivered</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="p-0">{renderList(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="active"><Card><CardContent className="p-0">{renderList(activeShipments)}</CardContent></Card></TabsContent>
        <TabsContent value="delivered"><Card><CardContent className="p-0">{renderList(byStatus("delivered"))}</CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setPendingStatus(""); } }}>
        {selected && (() => {
          const sc = statusConfig[mapStatus(selected.status)];
          return (
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /> {selected.id.slice(0, 8).toUpperCase()}</DialogTitle><DialogDescription>{selected.courier_name ?? "Carrier"} · {selected.tracking_number ?? "No tracking"}</DialogDescription></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Buyer</span><p className="font-medium text-foreground">{buyerNames[selected.buyer_id] ?? "Customer"}</p></div>
                  <div><span className="text-muted-foreground">Status</span><p className="font-medium text-foreground"><Badge variant="outline" className={sc.className}>{sc.label}</Badge></p></div>
                  <div><span className="text-muted-foreground">Order</span><p className="font-medium text-foreground">{selected.orders?.orderNumber ?? selected.order_id.slice(0, 8)}</p></div>
                  <div><span className="text-muted-foreground">Dispatched</span><p className="font-medium text-foreground">{selected.dispatched_at ? new Date(selected.dispatched_at).toLocaleDateString("en-GB") : "—"}</p></div>
                </div>

                {selected.orders?.products?.listingContext !== "service" ? (
                  <div className={`rounded-lg border p-3 ${hasDeliveryAddress(selected.orders?.shippingAddress) ? "border-border bg-muted/50" : "border-red-200 bg-red-50"}`}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Ship to address</p>
                    {hasDeliveryAddress(selected.orders?.shippingAddress) ? (
                      <>
                        <p className="text-sm font-semibold text-foreground">{buyerNames[selected.buyer_id] ?? "Customer"}</p>
                        <p className="text-sm text-foreground">
                          {[selected.orders?.shippingAddress?.line1, selected.orders?.shippingAddress?.line2, selected.orders?.shippingAddress?.city, selected.orders?.shippingAddress?.county ?? selected.orders?.shippingAddress?.state, selected.orders?.shippingAddress?.postcode ?? selected.orders?.shippingAddress?.postal_code, selected.orders?.shippingAddress?.countryCode === "GB" ? "United Kingdom" : selected.orders?.shippingAddress?.country].filter(Boolean).join(", ")}
                        </p>
                        {selected.orders?.shippingMethod ? <p className="mt-2 text-xs text-muted-foreground">Delivery method: <span className="font-semibold text-foreground">{selected.orders.shippingMethod}</span></p> : null}
                        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => handlePrintLabel(selected)}><Printer className="mr-1.5 h-3.5 w-3.5" />Print shipping label</Button>
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-red-700">Delivery address missing - do not dispatch this order.</p>
                    )}
                  </div>
                ) : null}

                {selected.proof_of_delivery_url ? (
                  <div className="rounded-lg bg-muted/50 border border-border p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">PROOF OF DELIVERY</p>
                    <Button type="button" variant="outline" size="sm" disabled={openingPod} onClick={() => handleViewProofOfDelivery(selected.id)}>
                      {openingPod ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5 mr-1.5" />}
                      View document
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted/50 border border-border p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">PROOF OF DELIVERY</p>
                    <label className="block">
                      <span className="sr-only">Upload proof of delivery</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf" disabled={uploadingPod} className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleUploadProofOfDelivery(selected.id, file); }} />
                    </label>
                    {uploadingPod && <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
                  </div>
                )}

                <div className="rounded-lg bg-muted/50 border border-border p-3"><p className="text-xs font-semibold text-muted-foreground mb-1">SHIPMENT CREATED</p><p className="text-sm text-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(selected.created_at).toLocaleString("en-GB")}</p></div>

                <div className="space-y-2">
                  <Label className="text-xs">Update Status</Label>
                  <div className="flex gap-2">
                    <Select value={pendingStatus} onValueChange={setPendingStatus}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select new status…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem><SelectItem value="Processing">Processing</SelectItem><SelectItem value="Dispatched">Dispatched</SelectItem><SelectItem value="In Transit">In Transit</SelectItem><SelectItem value="Out for Delivery">Out for Delivery</SelectItem><SelectItem value="Delivered">Delivered</SelectItem><SelectItem value="Delivery Failed">Delivery Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" disabled={!pendingStatus || pendingStatus === selected.status || updatingStatus || correctingDispatch} onClick={() => void handleUpdateStatus(selected, pendingStatus)}>{updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>
                  </div>
                  {selected.status === "Dispatched" ? <Button type="button" variant="outline" className="w-full border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" disabled={correctingDispatch || updatingStatus} onClick={() => void handleCorrectDispatch(selected)}>{correctingDispatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Correct accidental dispatch</Button> : null}
                </div>
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> Log Shipment</DialogTitle><DialogDescription>Record a new shipment for one of your paid/in-progress orders.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="text-xs">Order *</Label><Select value={createForm.orderId} onValueChange={(v) => setCreateForm((f) => ({ ...f, orderId: v }))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select an order…" /></SelectTrigger><SelectContent>{sellerOrders.length === 0 ? <SelectItem value="_none" disabled>No eligible orders found</SelectItem> : sellerOrders.map((o) => <SelectItem key={o.id} value={o.id}>{o.orderNumber || o.id.slice(0, 8).toUpperCase()} — {o.status}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Carrier / Courier</Label><Select value={createForm.courierName} onValueChange={(v) => setCreateForm((f) => ({ ...f, courierName: v }))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select carrier…" /></SelectTrigger><SelectContent><SelectItem value="Royal Mail">Royal Mail</SelectItem><SelectItem value="Evri">Evri</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Tracking Number</Label><Input className="mt-1" placeholder="e.g. JD000123456789" value={createForm.trackingNumber} onChange={(e) => setCreateForm((f) => ({ ...f, trackingNumber: e.target.value }))} /></div>
            <div><Label className="text-xs">Dispatch Date (optional)</Label><Input type="date" className="mt-1" value={createForm.dispatchedAt} onChange={(e) => setCreateForm((f) => ({ ...f, dispatchedAt: e.target.value }))} /></div>
          </div>
          <DialogFooter className="flex gap-2"><Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button><Button onClick={() => void handleCreateShipment()} disabled={!createForm.orderId || creating}>{creating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating…</> : "Create Shipment"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerShipments;