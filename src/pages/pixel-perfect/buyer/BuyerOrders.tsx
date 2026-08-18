import { useState, useEffect } from "react";
import { Package, Search, Eye, RotateCcw, FileDown, AlertTriangle, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useToast } from "@/hooks/use-toast";
import { authorizedFetch } from "@/lib/authorizedFetch";

interface OrderRow {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  sellerId: string;
  productId: string;
  products: { title: string } | null;
}

const statusColor: Record<string, string> = {
  pending: "bg-primary/10 text-primary border-primary/40",
  awaiting_payment: "bg-primary/10 text-primary border-primary/40",
  paid: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  packed: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  shipped: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  delivered: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

const RETURN_REASONS = [
  { value: "defective", label: "Defective / Not Working" },
  { value: "not_as_described", label: "Not as Described" },
  { value: "wrong_item", label: "Wrong Item Received" },
  { value: "damaged", label: "Damaged in Transit" },
  { value: "changed_mind", label: "Changed My Mind" },
  { value: "other", label: "Other" },
];

const DISPUTE_REASONS = [
  { value: "item_not_received", label: "Item Not Received" },
  { value: "not_as_described", label: "Not as Described" },
  { value: "item_damaged", label: "Item Damaged" },
  { value: "defective_product", label: "Defective Product" },
  { value: "seller_not_responding", label: "Seller Not Responding" },
  { value: "other", label: "Other" },
];

const BuyerOrders = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Return request dialog
  const [returnOrder, setReturnOrder] = useState<OrderRow | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnDescription, setReturnDescription] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);

  // Dispute dialog
  const [disputeOrder, setDisputeOrder] = useState<OrderRow | null>(null);
  const [disputeSubject, setDisputeSubject] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);

  // Confirm-delivery dialog
  const [confirmDeliveryOrder, setConfirmDeliveryOrder] = useState<OrderRow | null>(null);
  const [confirmDeliveryLoading, setConfirmDeliveryLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, orderNumber, total, status, createdAt, sellerId, productId, products(title)")
          .eq("buyerId", user.id)
          .order("createdAt", { ascending: false });
        if (error) throw error;
        setOrders((data as unknown as OrderRow[]) || []);
      } catch (err) {
        console.error("Error fetching buyer orders:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const filtered = orders.filter(
    (o) =>
      (o.orderNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.products?.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (s: string) => filtered.filter((o) => o.status === s);

  const handleDownloadInvoice = async (orderId: string, orderNumber: string) => {
    try {
      const res = await authorizedFetch("/.netlify/functions/generate-invoice", {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || "Failed to generate invoice");
      }
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${orderNumber || orderId.slice(0, 8)}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: "Invoice unavailable", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleConfirmDelivery = async () => {
    if (!confirmDeliveryOrder) return;
    setConfirmDeliveryLoading(true);
    try {
      const res = await authorizedFetch("/.netlify/functions/confirm-delivery", {
        method: "POST",
        body: JSON.stringify({ orderId: confirmDeliveryOrder.id }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to confirm delivery");
      setOrders((prev) => prev.map((o) => o.id === confirmDeliveryOrder.id ? { ...o, status: "completed" } : o));
      toast({ title: "Delivery confirmed", description: "The seller's funds have been released. Thank you!" });
      setConfirmDeliveryOrder(null);
    } catch (err) {
      toast({ title: "Could not confirm delivery", description: (err as Error).message, variant: "destructive" });
    } finally {
      setConfirmDeliveryLoading(false);
    }
  };

  const handleReturnSubmit = async () => {
    if (!user || !returnOrder || !returnReason || !returnDescription.trim()) return;
    setReturnLoading(true);
    try {
      // Prevent duplicate open returns for the same order
      const { data: existing } = await supabase
        .from("returns")
        .select("id")
        .eq("orderId", returnOrder.id)
        .neq("status", "rejected")
        .limit(1);
      if (existing && existing.length > 0) {
        toast({ title: "Return already requested", description: "A return request for this order already exists.", variant: "destructive" });
        return;
      }
      const { error } = await supabase.from("returns").insert({
        orderId: returnOrder.id,
        buyerId: user.id,
        sellerId: returnOrder.sellerId,
        reason: returnReason,
        description: returnDescription.trim(),
        status: "requested",
      });
      if (error) throw error;
      toast({ title: "Return requested", description: "Your return request has been submitted to the seller." });
      setReturnOrder(null);
      setReturnReason("");
      setReturnDescription("");
    } catch (err) {
      toast({ title: "Return request failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setReturnLoading(false);
    }
  };

  const handleDisputeSubmit = async () => {
    if (!user || !disputeOrder || !disputeSubject.trim() || !disputeReason || !disputeDescription.trim()) return;
    setDisputeLoading(true);
    try {
      const { data: existingDispute, error: existingError } = await supabase
        .from("disputes")
        .select("id")
        .eq("orderId", disputeOrder.id)
        .in("status", ["open", "in_review"])
        .limit(1);
      if (existingError) throw existingError;
      if (existingDispute && existingDispute.length > 0) {
        toast({ title: "Dispute already open", description: "An active dispute for this order already exists.", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("disputes").insert({
        orderId: disputeOrder.id,
        buyerId: user.id,
        sellerId: disputeOrder.sellerId,
        subject: disputeSubject.trim(),
        description: disputeDescription.trim(),
        protectionReason: disputeReason,
        status: "open",
      });
      if (error) throw error;
      toast({ title: "Dispute opened", description: "Your dispute has been submitted. We'll review it and contact you within 48 hours." });
      setDisputeOrder(null);
      setDisputeSubject("");
      setDisputeReason("");
      setDisputeDescription("");
    } catch (err) {
      toast({ title: "Failed to open dispute", description: (err as Error).message, variant: "destructive" });
    } finally {
      setDisputeLoading(false);
    }
  };

  const renderTable = (data: OrderRow[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead className="hidden sm:table-cell">Product</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              Loading…
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No orders found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium text-sm">
                {o.orderNumber || o.id.slice(0, 8).toUpperCase()}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                {o.products?.title ?? "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(o.createdAt).toLocaleDateString("en-GB")}
              </TableCell>
              <TableCell className="font-semibold text-sm">
                £{(o.total ?? 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor[o.status] ?? ""}>{o.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={["shipped", "delivered"].includes(o.status) ? "Track shipment" : "Tracking not yet available"}
                    disabled={!["shipped", "delivered"].includes(o.status)}
                    onClick={() => navigate(`/tracking/${o.orderNumber || o.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${o.status === "delivered" ? "text-emerald-600" : ""}`}
                    title={o.status === "delivered" ? "Confirm delivery" : o.status === "completed" ? "Delivery confirmed" : "Confirm once the seller marks the order delivered"}
                    disabled={o.status !== "delivered"}
                    onClick={() => setConfirmDeliveryOrder(o)}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={["delivered", "completed"].includes(o.status) ? "Request return" : "Returns available after delivery"}
                    disabled={!["delivered", "completed"].includes(o.status)}
                    onClick={() => {
                      setReturnOrder(o);
                      setReturnReason("");
                      setReturnDescription("");
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary"
                    title={["paid", "packed", "shipped", "delivered", "completed"].includes(o.status) ? "Open dispute" : "Disputes available after payment"}
                    disabled={!["paid", "packed", "shipped", "delivered", "completed"].includes(o.status)}
                    onClick={() => {
                      setDisputeOrder(o);
                      setDisputeSubject("");
                      setDisputeReason("");
                      setDisputeDescription("");
                    }}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Download invoice"
                    onClick={() => handleDownloadInvoice(o.id, o.orderNumber)}
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">Track and manage your purchases.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by order ID or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="delivered">Pending Confirmation</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(filtered)}</div></CardContent></Card></TabsContent>
        <TabsContent value="processing"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(filtered.filter((o) => ["pending","paid","packed"].includes(o.status)))}</div></CardContent></Card></TabsContent>
        <TabsContent value="shipped"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(byStatus("shipped"))}</div></CardContent></Card></TabsContent>
        <TabsContent value="delivered"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(byStatus("delivered"))}</div></CardContent></Card></TabsContent>
        <TabsContent value="completed"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(byStatus("completed"))}</div></CardContent></Card></TabsContent>
      </Tabs>

      {/* Return Request Dialog */}
      <Dialog open={!!returnOrder} onOpenChange={(open) => { if (!open) setReturnOrder(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a Return</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Order: <span className="font-medium text-foreground">{returnOrder?.orderNumber || returnOrder?.id?.slice(0, 8).toUpperCase()}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="return-reason">Reason for Return</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger id="return-reason">
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-description">Description</Label>
              <Textarea
                id="return-description"
                placeholder="Please describe the issue in detail…"
                value={returnDescription}
                onChange={(e) => setReturnDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOrder(null)} disabled={returnLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleReturnSubmit}
              disabled={returnLoading || !returnReason || !returnDescription.trim()}
            >
              {returnLoading ? "Submitting…" : "Submit Return Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={!!disputeOrder} onOpenChange={(open) => { if (!open) setDisputeOrder(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open a Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Order: <span className="font-medium text-foreground">{disputeOrder?.orderNumber || disputeOrder?.id?.slice(0, 8).toUpperCase()}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="dispute-subject">Subject</Label>
              <input
                id="dispute-subject"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Brief summary of the issue"
                value={disputeSubject}
                onChange={(e) => setDisputeSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispute-reason">Reason</Label>
              <Select value={disputeReason} onValueChange={setDisputeReason}>
                <SelectTrigger id="dispute-reason">
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {DISPUTE_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispute-description">Description</Label>
              <Textarea
                id="dispute-description"
                placeholder="Please describe the problem in detail…"
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOrder(null)} disabled={disputeLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleDisputeSubmit}
              disabled={disputeLoading || !disputeSubject.trim() || !disputeReason || !disputeDescription.trim()}
            >
              {disputeLoading ? "Submitting…" : "Open Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delivery Dialog */}
      <Dialog open={!!confirmDeliveryOrder} onOpenChange={(open) => { if (!open) setConfirmDeliveryOrder(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCheck className="h-5 w-5 text-emerald-600" /> Confirm Delivery
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-foreground">
              Please confirm that order{" "}
              <span className="font-semibold">
                {confirmDeliveryOrder?.orderNumber || confirmDeliveryOrder?.id?.slice(0, 8).toUpperCase()}
              </span>{" "}
              has been delivered to your satisfaction.
            </p>
            <p className="text-xs text-muted-foreground">
              Once confirmed, the escrow will be released to the seller. You can still open a dispute if there is a problem.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeliveryOrder(null)} disabled={confirmDeliveryLoading}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleConfirmDelivery}
              disabled={confirmDeliveryLoading}
            >
              {confirmDeliveryLoading ? "Confirming…" : "Yes, order delivered"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerOrders;
