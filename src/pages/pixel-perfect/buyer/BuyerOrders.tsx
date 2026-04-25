import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Package, Eye, RotateCcw, AlertTriangle, FileDown, CheckCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";

interface OrderRow {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  sellerId: string | null;
  products: { title: string } | null;
}

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-200",
  paid: "bg-amber-500/15 text-amber-700 border-amber-200",
  packed: "bg-amber-500/15 text-amber-700 border-amber-200",
  shipped: "bg-blue-500/15 text-blue-700 border-blue-200",
  delivered: "bg-orange-500/15 text-orange-700 border-orange-200",
  completed: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
  refunded: "bg-destructive/15 text-destructive border-destructive/20",
  invoice_requested: "bg-blue-500/15 text-blue-700 border-blue-200",
};

const RETURN_REASONS = [
  { value: "damaged", label: "Item arrived damaged" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "changed_mind", label: "Changed my mind" },
  { value: "other", label: "Other" },
];

const DISPUTE_REASONS: { value: string; label: string }[] = [
  { value: "item_not_received", label: "Item not received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "item_damaged", label: "Item arrived damaged" },
  { value: "defective_product", label: "Defective product" },
  { value: "seller_not_responding", label: "Seller not responding" },
  { value: "other", label: "Other" },
];

const BuyerOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Return request dialog state
  const [returnOrder, setReturnOrder] = useState<OrderRow | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnDescription, setReturnDescription] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);

  // Dispute dialog state
  const [disputeOrder, setDisputeOrder] = useState<OrderRow | null>(null);
  const [disputeSubject, setDisputeSubject] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);

  // Confirm delivery dialog state
  const [confirmDeliveryOrder, setConfirmDeliveryOrder] = useState<OrderRow | null>(null);
  const [confirmDeliveryLoading, setConfirmDeliveryLoading] = useState(false);

  const handleConfirmDelivery = async () => {
    if (!confirmDeliveryOrder || !user) return;
    setConfirmDeliveryLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "completed",
          escrowStatus: "released",
          escrowReleasedAt: new Date().toISOString(),
        })
        .eq("id", confirmDeliveryOrder.id)
        .eq("buyerId", user.id);
      if (error) throw error;

      // Notify the seller that the buyer has confirmed and funds are released.
      if (confirmDeliveryOrder.sellerId) {
        await supabase.from("notifications").insert({
          userId: confirmDeliveryOrder.sellerId,
          type: "payment",
          title: "Job confirmed — funds released",
          message: `The buyer has confirmed completion of order ${confirmDeliveryOrder.orderNumber || confirmDeliveryOrder.id.slice(0, 8).toUpperCase()}. Escrow has been released.`,
          link: "/seller/orders",
        });
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === confirmDeliveryOrder.id ? { ...o, status: "completed" } : o
        )
      );
      toast({ title: "Job confirmed", description: "Thank you for confirming. Funds have been released to the provider." });
      setConfirmDeliveryOrder(null);
    } catch (err) {
      toast({ title: "Failed to confirm", description: (err as Error).message, variant: "destructive" });
    } finally {
      setConfirmDeliveryLoading(false);
    }
  };

  const handleDownloadInvoice = async (orderId: string, orderNumber: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/.netlify/functions/generate-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Failed to generate invoice');
      }
      // The function returns an HTML page — open it in a new tab so the user
      // can print or save as PDF using their browser's built-in print dialog.
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        // Fallback: download as .html if pop-up was blocked
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${orderNumber || orderId.slice(0, 8)}.html`;
        a.click();
      }
      // Revoke after a short delay to allow the new tab to fully load
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      toast({ title: 'Invoice generation failed', description: (err as Error).message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, orderNumber, total, status, createdAt, sellerId, products(title)")
          .eq("buyerId", user.id)
          .order("createdAt", { ascending: false });
        if (error) throw error;
        setOrders((data as unknown as OrderRow[]) || []);
      } catch (err) {
        console.error("Error fetching orders:", err);
        toast({ title: "Failed to load orders", description: "Please refresh the page.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const filtered = orders.filter(
    (o) =>
      (o.orderNumber || o.id).toLowerCase().includes(search.toLowerCase()) ||
      (o.products?.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((o) => o.status === status);

  const handleReturnSubmit = async () => {
    if (!returnOrder || !user || !returnReason || !returnDescription.trim()) return;
    if (!returnOrder.sellerId) {
      toast({ title: "Cannot submit return", description: "Seller information is unavailable for this order. Please contact support for assistance.", variant: "destructive" });
      return;
    }
    setReturnLoading(true);
    try {
      // Prevent duplicate open returns for the same order
      const { data: existing } = await supabase
        .from("returns")
        .select("id")
        .eq("orderId", returnOrder.id)
        .neq("status", "rejected")
        .maybeSingle();
      if (existing) {
        toast({ title: "Return already submitted", description: "A return request for this order is already open or in progress.", variant: "destructive" });
        setReturnOrder(null);
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
      toast({ title: "Return requested", description: "Your return request has been submitted. We'll be in touch shortly." });
      setReturnOrder(null);
      setReturnReason("");
      setReturnDescription("");
    } catch (err) {
      toast({ title: "Failed to submit return", description: (err as Error).message, variant: "destructive" });
    } finally {
      setReturnLoading(false);
    }
  };

  const handleDisputeSubmit = async () => {
    if (!disputeOrder || !user || !disputeSubject.trim() || !disputeReason || !disputeDescription.trim()) return;
    if (!disputeOrder.sellerId) {
      toast({ title: "Cannot open dispute", description: "Seller information is unavailable. Please contact support.", variant: "destructive" });
      return;
    }
    setDisputeLoading(true);
    try {
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
                    title={o.status === "delivered" ? "Confirm job completion" : o.status === "completed" ? "Job completed" : "Confirm once provider marks job done"}
                    disabled={o.status !== "delivered"}
                    onClick={() => setConfirmDeliveryOrder(o)}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={o.status === "completed" ? "Request return" : "Returns available after job completion"}
                    disabled={o.status !== "completed"}
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
                    className="h-8 w-8 text-amber-600"
                    title={["paid", "packed", "shipped", "delivered"].includes(o.status) ? "Open dispute" : "Disputes available after payment"}
                    disabled={!["paid", "packed", "shipped", "delivered"].includes(o.status)}
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
          <TabsTrigger value="shipped">In Progress</TabsTrigger>
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

      {/* Confirm Job Completion Dialog */}
      <Dialog open={!!confirmDeliveryOrder} onOpenChange={(open) => { if (!open) setConfirmDeliveryOrder(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCheck className="h-5 w-5 text-emerald-600" /> Confirm Job Completion
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-foreground">
              Please confirm that the work for order{" "}
              <span className="font-semibold">
                {confirmDeliveryOrder?.orderNumber || confirmDeliveryOrder?.id?.slice(0, 8).toUpperCase()}
              </span>{" "}
              has been completed to your satisfaction.
            </p>
            <p className="text-xs text-muted-foreground">
              Once confirmed, the escrow will be released to the provider. You can still open a dispute if there is a problem.
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
              {confirmDeliveryLoading ? "Confirming…" : "Yes, job is done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerOrders;
