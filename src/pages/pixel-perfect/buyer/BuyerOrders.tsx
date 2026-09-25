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
import { Search, Package, Eye, RotateCcw, AlertTriangle, FileDown, CheckCheck, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";
import { authorizedFetch } from "@/lib/authorizedFetch";

interface OrderRow {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  sellerId: string | null;
  commercialMode?: string | null;
  supplierRuntimeStatus?: string | null;
  supplierConfirmation?: string | null;
  trackingRef?: string | null;
  products: { title: string } | null;
  order_items: Array<{ productTitleSnapshot: string | null }> | null;
}

interface ReturnState {
  id: string;
  orderId: string;
  status: string;
  buyerCarrier: string | null;
  buyerTrackingNumber: string | null;
  refundAmount: number | null;
  createdAt: string;
}

function orderProductTitle(order: OrderRow): string {
  const snapshot = order.order_items?.find((item) => item.productTitleSnapshot?.trim())?.productTitleSnapshot?.trim();
  return snapshot || order.products?.title || "—";
}

const statusColor: Record<string, string> = {
  pending: "bg-primary/15 text-primary border-primary/40",
  paid: "bg-primary/15 text-primary border-primary/40",
  packed: "bg-primary/15 text-primary border-primary/40",
  shipped: "bg-blue-500/15 text-blue-700 border-blue-200",
  delivered: "bg-orange-500/15 text-orange-700 border-orange-200",
  completed: "bg-success/15 text-success border-success/40",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
  refunded: "bg-destructive/15 text-destructive border-destructive/20",
  invoice_requested: "bg-blue-500/15 text-blue-700 border-blue-200",
  processing: "bg-primary/15 text-primary border-primary/40",
  in_transit: "bg-blue-500/15 text-blue-700 border-blue-200",
  out_for_delivery: "bg-blue-500/15 text-blue-700 border-blue-200",
  supplier_issue: "bg-destructive/15 text-destructive border-destructive/20",
  delivery_exception: "bg-destructive/15 text-destructive border-destructive/20",
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

const CANCELLATION_REASONS = [
  { value: "accidental_purchase", label: "Purchased by mistake" },
  { value: "duplicate_order", label: "Duplicate order" },
  { value: "wrong_delivery_details", label: "Wrong delivery details" },
  { value: "other", label: "Other" },
];

const BuyerOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [returnOrder, setReturnOrder] = useState<OrderRow | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnDescription, setReturnDescription] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnStates, setReturnStates] = useState<Map<string, ReturnState>>(() => new Map());
  const [trackingReturn, setTrackingReturn] = useState<ReturnState | null>(null);
  const [returnCarrier, setReturnCarrier] = useState("");
  const [returnTrackingNumber, setReturnTrackingNumber] = useState("");
  const [returnTrackingSaving, setReturnTrackingSaving] = useState(false);

  const [disputeOrder, setDisputeOrder] = useState<OrderRow | null>(null);
  const [disputeSubject, setDisputeSubject] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [cancellationOrder, setCancellationOrder] = useState<OrderRow | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationDetails, setCancellationDetails] = useState("");
  const [cancellationLoading, setCancellationLoading] = useState(false);
  const [cancellationRequestedIds, setCancellationRequestedIds] = useState<Set<string>>(() => new Set());

  const [confirmDeliveryOrder, setConfirmDeliveryOrder] = useState<OrderRow | null>(null);
  const [confirmDeliveryLoading, setConfirmDeliveryLoading] = useState(false);
  const [deliveryConfirmedIds, setDeliveryConfirmedIds] = useState<Set<string>>(() => new Set());

  const handleConfirmDelivery = async () => {
    if (!confirmDeliveryOrder || !user) return;
    setConfirmDeliveryLoading(true);
    try {
      const res = await authorizedFetch("/.netlify/functions/confirm-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: confirmDeliveryOrder.id }),
      });

      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const errBody = await res.json() as { error?: string };
          serverMessage = errBody.error;
        } catch {
          serverMessage = res.statusText || undefined;
        }
        throw new Error(serverMessage ?? `Server error ${res.status}`);
      }

      const confirmedOrderId = confirmDeliveryOrder.id;
      setDeliveryConfirmedIds((prev) => new Set(prev).add(confirmedOrderId));
      toast({
        title: "Delivery confirmed",
        description: "Thank you for confirming. Seller funds remain protected until the escrow release checks and protection window are complete.",
      });
      setConfirmDeliveryOrder(null);
    } catch (err) {
      toast({ title: "Failed to confirm", description: (err as Error).message, variant: "destructive" });
    } finally {
      setConfirmDeliveryLoading(false);
    }
  };

  const handleDownloadInvoice = async (orderId: string, orderNumber: string) => {
    try {
      const res = await authorizedFetch('/.netlify/functions/generate-invoice', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Failed to generate invoice');
      }
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        toast({
          title: 'Pop-up blocked',
          description:
            'Your browser blocked the invoice from opening. Please allow pop-ups for this site and try again. ' +
            'The invoice has been downloaded as an HTML file as a fallback.',
          variant: 'destructive',
        });
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${orderNumber || orderId.slice(0, 8)}.html`;
        a.click();
      }
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
          .select("id, orderNumber, total, status, createdAt, sellerId, commercialMode, products(title), order_items(productTitleSnapshot)")
          .eq("buyerId", user.id)
          .order("createdAt", { ascending: false });
        if (error) throw error;
        const rows = (data as unknown as OrderRow[]) || [];
        const enrichedRows = await Promise.all(rows.map(async (order) => {
          if (order.commercialMode !== "loadify_supplier_fulfilled") return order;
          try {
            const response = await authorizedFetch(`/.netlify/functions/supplier-order-status?orderId=${encodeURIComponent(order.id)}`);
            if (!response.ok) return order;
            const status = await response.json() as {
              status?: string; supplierConfirmation?: string;
              tracking?: { trackingRef?: string | null } | null;
            };
            return {
              ...order,
              supplierRuntimeStatus: status.status || null,
              supplierConfirmation: status.supplierConfirmation || null,
              trackingRef: status.tracking?.trackingRef || null,
            };
          } catch {
            return order;
          }
        }));
        setOrders(enrichedRows);
        if (rows.length > 0) {
          const orderIds = rows.map((order) => order.id);
          const [{ data: cancellationRows }, { data: returnRows }] = await Promise.all([
            supabase
              .from("order_cancellation_requests")
              .select("orderId")
              .in("orderId", orderIds)
              .eq("status", "requested"),
            supabase
              .from("returns")
              .select("id, orderId, status, buyerCarrier, buyerTrackingNumber, refundAmount, createdAt")
              .in("orderId", orderIds)
              .order("createdAt", { ascending: false }),
          ]);
          setCancellationRequestedIds(new Set((cancellationRows ?? []).map((row) => String(row.orderId))));
          const nextReturns = new Map<string, ReturnState>();
          for (const row of (returnRows ?? []) as unknown as ReturnState[]) {
            if (!nextReturns.has(row.orderId)) nextReturns.set(row.orderId, row);
          }
          setReturnStates(nextReturns);
        } else {
          setCancellationRequestedIds(new Set());
          setReturnStates(new Map());
        }
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
      orderProductTitle(o).toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((o) => o.status === status);

  const handleReturnSubmit = async () => {
    if (!returnOrder || !user || !returnReason || !returnDescription.trim()) return;
    const supplierFulfilled = returnOrder.commercialMode === "loadify_supplier_fulfilled";
    if (!supplierFulfilled && !returnOrder.sellerId) {
      toast({ title: "Cannot submit return", description: "Seller information is unavailable for this order. Please contact support for assistance.", variant: "destructive" });
      return;
    }
    setReturnLoading(true);
    try {
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

      if (supplierFulfilled) {
        const response = await authorizedFetch("/.netlify/functions/request-supplier-customer-return", {
          method: "POST",
          body: JSON.stringify({
            orderId: returnOrder.id,
            reasonCode: returnReason,
            description: returnDescription.trim(),
          }),
        });
        const payload = await response.json() as {
          error?: string;
          return?: ReturnState;
          manualReviewRequired?: boolean;
        };
        if (!response.ok || !payload.return) {
          throw new Error(payload.error || "Supplier return request could not be created.");
        }
        setReturnStates((current) => new Map(current).set(returnOrder.id, payload.return as ReturnState));
        toast({
          title: "Return requested",
          description: payload.manualReviewRequired
            ? "Loadify has recorded the return. Supplier authorisation is being reviewed before any refund is issued."
            : "Your return request has been recorded. No refund is issued until the return conditions are completed.",
        });
        setReturnOrder(null);
        setReturnReason("");
        setReturnDescription("");
        return;
      }

      const { data: orderItem, error: orderItemError } = await supabase
        .from("order_items")
        .select("id, quantity")
        .eq("orderId", returnOrder.id)
        .limit(1)
        .maybeSingle<{ id: string; quantity: number | null }>();
      if (orderItemError || !orderItem?.id) throw new Error("Order item information is unavailable. Please contact support.");

      const eligibilityResponse = await authorizedFetch("/.netlify/functions/customer-return-eligibility", {
        method: "POST",
        body: JSON.stringify({
          orderId: returnOrder.id,
          orderItemId: orderItem.id,
          quantity: orderItem.quantity ?? 1,
          reasonCode: returnReason,
        }),
      });
      const eligibility = await eligibilityResponse.json() as {
        error?: string;
        result?: { decision?: string; automaticRefundExecutionAllowed?: boolean; paymentMutationAllowed?: boolean };
      };
      if (!eligibilityResponse.ok) throw new Error(eligibility.error || "Return eligibility could not be checked.");
      if (eligibility.result?.decision === "ineligible") {
        throw new Error("This order is outside the current return eligibility boundary.");
      }
      if (eligibility.result?.automaticRefundExecutionAllowed !== false || eligibility.result?.paymentMutationAllowed !== false) {
        throw new Error("Unsafe return policy response. No return was created.");
      }

      const { data: created, error } = await supabase.from("returns").insert({
        orderId: returnOrder.id,
        buyerId: user.id,
        sellerId: returnOrder.sellerId,
        reason: returnReason,
        description: returnDescription.trim(),
        status: "requested",
      }).select("id, orderId, status, buyerCarrier, buyerTrackingNumber, refundAmount, createdAt").single();
      if (error) throw error;
      const createdReturn = created as unknown as ReturnState;
      setReturnStates((current) => new Map(current).set(returnOrder.id, createdReturn));
      toast({ title: "Return requested", description: "Your return request has been submitted. No refund is issued until the return conditions are completed." });
      setReturnOrder(null);
      setReturnReason("");
      setReturnDescription("");
    } catch (err) {
      toast({ title: "Failed to submit return", description: (err as Error).message, variant: "destructive" });
    } finally {
      setReturnLoading(false);
    }
  };

  const openReturnTracking = (returnState: ReturnState) => {
    setTrackingReturn(returnState);
    setReturnCarrier(returnState.buyerCarrier ?? "");
    setReturnTrackingNumber(returnState.buyerTrackingNumber ?? "");
  };

  const handleReturnTrackingSave = async () => {
    if (!trackingReturn || !user?.id || returnTrackingSaving) return;
    const carrier = returnCarrier.trim();
    const tracking = returnTrackingNumber.trim();
    if (!carrier || !/^[A-Za-z0-9][A-Za-z0-9 _./-]{3,79}$/.test(tracking)) {
      toast({ title: "Complete return tracking", description: "Enter the carrier and a valid tracking number.", variant: "destructive" });
      return;
    }
    setReturnTrackingSaving(true);
    try {
      const { data, error } = await supabase
        .from("returns")
        .update({ buyerCarrier: carrier, buyerTrackingNumber: tracking })
        .eq("id", trackingReturn.id)
        .eq("buyerId", user.id)
        .eq("status", "approved")
        .select("id, orderId, status, buyerCarrier, buyerTrackingNumber, refundAmount, createdAt")
        .single();
      if (error) throw error;
      const updated = data as unknown as ReturnState;
      setReturnStates((current) => new Map(current).set(updated.orderId, updated));
      setTrackingReturn(updated);
      toast({ title: "Return tracking saved", description: "The seller can now follow the return parcel." });
    } catch (error) {
      toast({ title: "Tracking was not saved", description: (error as Error).message, variant: "destructive" });
    } finally {
      setReturnTrackingSaving(false);
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

  const handleCancellationSubmit = async () => {
    if (!cancellationOrder || !cancellationReason || cancellationLoading) return;
    setCancellationLoading(true);
    try {
      const response = await authorizedFetch("/.netlify/functions/request-order-cancellation", {
        method: "POST",
        body: JSON.stringify({ orderId: cancellationOrder.id, reason: cancellationReason, details: cancellationDetails.trim() }),
      });
      const payload = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || "Cancellation could not be requested.");
      setCancellationRequestedIds((current) => new Set(current).add(cancellationOrder.id));
      setCancellationOrder(null); setCancellationReason(""); setCancellationDetails("");
      toast({ title: "Cancellation requested", description: payload.message || "The order remains active until the Stripe refund is confirmed." });
    } catch (err) {
      toast({ title: "Cancellation request failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setCancellationLoading(false);
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
          data.map((o) => {
            const deliveryConfirmed = deliveryConfirmedIds.has(o.id);
            const returnEligible = ["delivered", "completed"].includes(o.status);
            const returnState = returnStates.get(o.id);
            const canAddReturnTracking = returnState?.status === "approved" && !returnState.buyerTrackingNumber;
            const returnActionEnabled = returnEligible && (!returnState || canAddReturnTracking);
            const returnActionTitle = !returnEligible
              ? "Returns available after delivery"
              : !returnState
                ? "Request return"
                : canAddReturnTracking
                  ? "Add return tracking"
                  : returnState.status === "requested"
                    ? "Return request awaiting seller decision"
                    : returnState.status === "completed"
                      ? "Return completed"
                      : `Return ${returnState.status}`;
            return (
            <TableRow key={o.id}>
              <TableCell className="font-medium text-sm">
                {o.orderNumber || o.id.slice(0, 8).toUpperCase()}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                {orderProductTitle(o)}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(o.createdAt).toLocaleDateString("en-GB")}
              </TableCell>
              <TableCell className="font-semibold text-sm">
                £{(o.total ?? 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge variant="outline" className={statusColor[o.supplierRuntimeStatus || o.status] ?? ""}>
                    {(o.supplierRuntimeStatus || o.status).replaceAll("_", " ")}
                  </Badge>
                  {o.commercialMode === "loadify_supplier_fulfilled" && (
                    <span className="text-[11px] text-muted-foreground">
                      Sold by independent approved supplier{o.supplierConfirmation ? ` · Supplier ${o.supplierConfirmation}` : ""}
                      {o.trackingRef ? ` · Tracking ${o.trackingRef}` : ""}
                    </span>
                  )}
                  {returnState && (
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Return: {returnState.status.replace(/_/g, " ")}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600"
                    title={cancellationRequestedIds.has(o.id) ? "Cancellation already requested" : o.status === "paid" ? "Request cancellation" : "Cancellation requests are available before packing"}
                    disabled={o.status !== "paid" || cancellationRequestedIds.has(o.id)}
                    onClick={() => { setCancellationOrder(o); setCancellationReason(""); setCancellationDetails(""); }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
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
                    className={`h-8 w-8 ${o.status === "delivered" && !deliveryConfirmed ? "text-emerald-600" : ""}`}
                    title={deliveryConfirmed ? "Delivery confirmed — funds remain protected" : o.status === "delivered" ? "Confirm delivery" : o.status === "completed" ? "Delivery confirmed" : "Confirm once the seller marks the order delivered"}
                    disabled={o.status !== "delivered" || deliveryConfirmed}
                    onClick={() => setConfirmDeliveryOrder(o)}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${canAddReturnTracking ? "text-blue-600" : ""}`}
                    title={returnActionTitle}
                    disabled={!returnActionEnabled}
                    onClick={() => {
                      if (canAddReturnTracking && returnState) {
                        openReturnTracking(returnState);
                      } else {
                        setReturnOrder(o);
                        setReturnReason("");
                        setReturnDescription("");
                      }
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
            );
          })
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

      <Dialog open={!!cancellationOrder} onOpenChange={(open) => { if (!open) setCancellationOrder(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request order cancellation</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Submit this before the seller packs or dispatches the order. The order remains active until Loadify confirms the Stripe refund.</p>
            <div className="space-y-2"><Label>Reason</Label><Select value={cancellationReason} onValueChange={setCancellationReason}><SelectTrigger><SelectValue placeholder="Choose a reason…" /></SelectTrigger><SelectContent>{CANCELLATION_REASONS.map((reason) => <SelectItem key={reason.value} value={reason.value}>{reason.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="cancellation-details">Details (optional)</Label><Textarea id="cancellation-details" maxLength={1000} value={cancellationDetails} onChange={(event) => setCancellationDetails(event.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" disabled={cancellationLoading} onClick={() => setCancellationOrder(null)}>Keep order</Button><Button variant="destructive" disabled={cancellationLoading || !cancellationReason} onClick={handleCancellationSubmit}>{cancellationLoading ? "Submitting…" : "Submit request"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={!!trackingReturn} onOpenChange={(open) => { if (!open) setTrackingReturn(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Return Tracking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Your return has been approved. Add the carrier and tracking number after dispatching the parcel.
            </p>
            <div className="space-y-2">
              <Label htmlFor="return-carrier">Carrier</Label>
              <Input
                id="return-carrier"
                maxLength={80}
                placeholder="e.g. Royal Mail"
                value={returnCarrier}
                onChange={(event) => setReturnCarrier(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-tracking-number">Tracking number</Label>
              <Input
                id="return-tracking-number"
                maxLength={80}
                placeholder="Enter tracking number"
                value={returnTrackingNumber}
                onChange={(event) => setReturnTrackingNumber(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackingReturn(null)} disabled={returnTrackingSaving}>Close</Button>
            <Button onClick={() => void handleReturnTrackingSave()} disabled={returnTrackingSaving || !returnCarrier.trim() || returnTrackingNumber.trim().length < 4}>
              {returnTrackingSaving ? "Saving…" : "Save Tracking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Confirmation records receipt. Seller funds remain protected until the escrow protection window and final dispute/refund checks are complete.
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
