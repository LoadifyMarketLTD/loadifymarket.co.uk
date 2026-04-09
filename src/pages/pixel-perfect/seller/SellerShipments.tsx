import { useState, useEffect, useCallback } from "react";
import { Truck, Search, MapPin, Clock, Package, CheckCircle2, Plus, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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

type BuyerData = Pick<User, "id" | "firstName" | "lastName">;

interface ShipmentRow extends Shipment {
  orders?: {
    orderNumber?: string;
    products?: { title?: string } | null;
  } | null;
}

/** Map DB status to the display config keys */
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
  out_for_delivery: { label: "Out for Delivery", className: "bg-amber-500/10 text-amber-700" },
  delivered: { label: "Delivered", className: "bg-emerald-500/10 text-emerald-700" },
};

const SellerShipments = () => {
  const { user } = useAuthStore();
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [buyerNames, setBuyerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ShipmentRow | null>(null);

  // Create Shipment dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [sellerOrders, setSellerOrders] = useState<{ id: string; orderNumber: string; status: string }[]>([]);
  const [createForm, setCreateForm] = useState({ orderId: "", courierName: "", trackingNumber: "", dispatchedAt: "" });
  const [creating, setCreating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [uploadingPod, setUploadingPod] = useState(false);

  const loadShipments = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("shipments")
        .select(`*, orders(orderNumber, products(title))`)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as ShipmentRow[];
      setShipments(rows);

      // Resolve buyer names via secondary query
      const uniqueBuyerIds = [...new Set(rows.map((s) => s.buyer_id).filter(Boolean))];
      if (uniqueBuyerIds.length > 0) {
        const { data: buyers } = await supabase
          .from("users")
          .select("id, firstName, lastName")
          .in("id", uniqueBuyerIds);
        const names: Record<string, string> = {};
        (buyers ?? []).forEach((buyer: BuyerData) => {
          const name = [buyer.firstName, buyer.lastName].filter(Boolean).join(" ").trim();
          names[buyer.id] = name || "Customer";
        });
        setBuyerNames(names);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadShipments(); }, [loadShipments]);

  // Load seller's orders when the create dialog opens
  const handleOpenCreate = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("id, orderNumber, status")
      .eq("sellerId", user.id)
      .order("createdAt", { ascending: false });
    setSellerOrders((data ?? []) as { id: string; orderNumber: string; status: string }[]);
    setCreateForm({ orderId: "", courierName: "", trackingNumber: "", dispatchedAt: "" });
    setCreateOpen(true);
  };

  const handleCreateShipment = async () => {
    if (!createForm.orderId) return;
    setCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const payload: Record<string, unknown> = { order_id: createForm.orderId };
      if (createForm.courierName.trim()) payload.courier_name = createForm.courierName.trim();
      if (createForm.trackingNumber.trim()) payload.tracking_number = createForm.trackingNumber.trim();
      if (createForm.dispatchedAt) payload.dispatched_at = new Date(createForm.dispatchedAt).toISOString();

      const res = await fetch("/.netlify/functions/create-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("shipment_id", shipmentId);

      const res = await fetch("/.netlify/functions/upload-proof-of-delivery", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json() as { error?: string; url?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      toast({ title: "Proof of delivery uploaded" });
      await loadShipments();
      if (json.url) {
        const podUrl = json.url;
        setSelected((prev) => (prev && prev.id === shipmentId ? { ...prev, proof_of_delivery_url: podUrl } : prev));
      }
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setUploadingPod(false);
    }
  };

  const handleUpdateStatus = async (shipment: ShipmentRow, newStatus: string) => {
    if (!newStatus || newStatus === shipment.status) return;
    setUpdatingStatus(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`/.netlify/functions/update-shipment-status/${shipment.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to update status");

      // Notify buyer about the status change
      await supabase.from("notifications").insert({
        userId: shipment.buyer_id,
        type: "shipment",
        title: "Shipment update",
        message: `Your shipment ${shipment.id.slice(0, 8).toUpperCase()} status has been updated to: ${newStatus}.`,
      });

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

  const filtered = shipments.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.id.toLowerCase().includes(q) ||
      (s.tracking_number ?? "").toLowerCase().includes(q) ||
      (s.orders?.orderNumber ?? "").toLowerCase().includes(q)
    );
  });

  const byStatus = (status: string) => filtered.filter((s) => mapStatus(s.status) === status);
  const activeShipments = filtered.filter((s) => mapStatus(s.status) !== "delivered");

  const renderTable = (data: ShipmentRow[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shipment</TableHead>
          <TableHead className="hidden sm:table-cell">Order</TableHead>
          <TableHead>Buyer</TableHead>
          <TableHead className="hidden md:table-cell">Carrier</TableHead>
          <TableHead className="hidden lg:table-cell">Tracking</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              Loading shipments…
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No shipments found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((s) => {
            const displayStatus = mapStatus(s.status);
            const sc = statusConfig[displayStatus];
            return (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-sm">{s.id.slice(0, 8).toUpperCase()}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                  {s.orders?.orderNumber ?? s.order_id.slice(0, 8)}
                </TableCell>
                <TableCell className="text-sm">{buyerNames[s.buyer_id] ?? "Customer"}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{s.courier_name ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono">{s.tracking_number ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelected(s)}>Track</Button>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1200px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Shipments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading…" : `${shipments.length} shipments · ${activeShipments.length} active`}
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Log Shipment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Label Created", count: byStatus("label_created").length, icon: Package, color: "text-muted-foreground bg-muted" },
          { label: "In Transit", count: filtered.filter((s) => ["picked_up", "in_transit"].includes(mapStatus(s.status))).length, icon: Truck, color: "text-purple-600 bg-purple-500/10" },
          { label: "Out for Delivery", count: byStatus("out_for_delivery").length, icon: MapPin, color: "text-amber-600 bg-amber-500/10" },
          { label: "Delivered", count: byStatus("delivered").length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 space-y-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">{stat.count}</div>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search shipments or tracking..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(filtered)}</div></CardContent></Card></TabsContent>
        <TabsContent value="active"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(activeShipments)}</div></CardContent></Card></TabsContent>
        <TabsContent value="delivered"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(byStatus("delivered"))}</div></CardContent></Card></TabsContent>
      </Tabs>

      {/* Tracking Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setPendingStatus(""); } }}>
        {selected && (() => {
          const displayStatus = mapStatus(selected.status);
          const sc = statusConfig[displayStatus];
          return (
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" /> {selected.id.slice(0, 8).toUpperCase()}
                </DialogTitle>
                <DialogDescription>{selected.courier_name ?? "Carrier"} · {selected.tracking_number ?? "No tracking"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Buyer</span><p className="font-medium text-foreground">{buyerNames[selected.buyer_id] ?? "Customer"}</p></div>
                  <div><span className="text-muted-foreground">Status</span><p className="font-medium text-foreground"><Badge variant="outline" className={sc.className}>{sc.label}</Badge></p></div>
                  <div><span className="text-muted-foreground">Order</span><p className="font-medium text-foreground">{selected.orders?.orderNumber ?? selected.order_id.slice(0, 8)}</p></div>
                  <div><span className="text-muted-foreground">Dispatched</span><p className="font-medium text-foreground">{selected.dispatched_at ? new Date(selected.dispatched_at).toLocaleDateString("en-GB") : "—"}</p></div>
                </div>
                {selected.proof_of_delivery_url ? (
                  <div className="rounded-lg bg-muted/50 border border-border p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">PROOF OF DELIVERY</p>
                    <a href={selected.proof_of_delivery_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">View document</a>
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted/50 border border-border p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">PROOF OF DELIVERY</p>
                    <label className="block">
                      <span className="sr-only">Upload proof of delivery</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        disabled={uploadingPod}
                        className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadProofOfDelivery(selected.id, file);
                        }}
                      />
                    </label>
                    {uploadingPod && <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
                  </div>
                )}
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">SHIPMENT CREATED</p>
                  <p className="text-sm text-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(selected.created_at).toLocaleString("en-GB")}</p>
                </div>
                {/* Status update */}
                <div className="space-y-2">
                  <Label className="text-xs">Update Status</Label>
                  <div className="flex gap-2">
                    <Select value={pendingStatus} onValueChange={setPendingStatus}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select new status…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Processing">Processing</SelectItem>
                        <SelectItem value="Dispatched">Dispatched</SelectItem>
                        <SelectItem value="In Transit">In Transit</SelectItem>
                        <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Delivery Failed">Delivery Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!pendingStatus || pendingStatus === selected.status || updatingStatus}
                      onClick={() => handleUpdateStatus(selected, pendingStatus)}
                    >
                      {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>

      {/* Create Shipment Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Log Shipment
            </DialogTitle>
            <DialogDescription>Record a new shipment for one of your orders.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Order *</Label>
              <Select value={createForm.orderId} onValueChange={(v) => setCreateForm((f) => ({ ...f, orderId: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select an order…" />
                </SelectTrigger>
                <SelectContent>
                  {sellerOrders.length === 0 ? (
                    <SelectItem value="_none" disabled>No orders found</SelectItem>
                  ) : (
                    sellerOrders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.orderNumber || o.id.slice(0, 8).toUpperCase()} — {o.status}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Carrier / Courier</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Royal Mail, DPD, UPS"
                value={createForm.courierName}
                onChange={(e) => setCreateForm((f) => ({ ...f, courierName: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Tracking Number</Label>
              <Input
                className="mt-1"
                placeholder="e.g. JD000123456789"
                value={createForm.trackingNumber}
                onChange={(e) => setCreateForm((f) => ({ ...f, trackingNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Dispatch Date (optional)</Label>
              <Input
                type="date"
                className="mt-1"
                value={createForm.dispatchedAt}
                onChange={(e) => setCreateForm((f) => ({ ...f, dispatchedAt: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreateShipment} disabled={!createForm.orderId || creating}>
              {creating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating…</> : "Create Shipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerShipments;
