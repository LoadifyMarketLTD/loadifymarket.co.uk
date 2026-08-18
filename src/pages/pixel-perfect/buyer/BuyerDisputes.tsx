import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Plus, ChevronRight, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";

interface Dispute {
  id: string;
  orderId: string;
  orderNumber?: string;
  subject: string;
  description: string;
  protectionReason: string | null;
  status: "open" | "in_review" | "resolved" | "closed";
  resolution: string | null;
  resolutionType: string | null;
  createdAt: string;
}

interface BuyerOrder {
  id: string;
  orderNumber: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  open:      { label: "Open",      className: "border-primary/40 text-primary bg-primary-soft" },
  in_review: { label: "In Review", className: "border-blue-500/30 text-blue-600 bg-blue-50" },
  resolved:  { label: "Resolved",  className: "border-emerald-500/30 text-success bg-emerald-50" },
  closed:    { label: "Closed",    className: "border-slate-300 text-slate-500 bg-transparent" },
};

const protectionReasonLabels: Record<string, string> = {
  item_not_received:    "Item Not Received",
  not_as_described:     "Item Not As Described",
  item_damaged:         "Item Damaged",
  defective_product:    "Defective Product",
  seller_not_responding:"Seller Not Responding",
  other:                "Other",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const BuyerDisputes = () => {
  const { user } = useAuthStore();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Dispute | null>(null);

  // Open dispute dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [form, setForm] = useState({
    orderId: "",
    subject: "",
    description: "",
    protectionReason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchDisputes = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("disputes")
        .select("id, orderId, subject, description, protectionReason, status, resolution, resolutionType, createdAt")
        .eq("buyerId", user.id)
        .order("createdAt", { ascending: false });

      if (error) throw error;

      // Resolve order numbers
      const orderIds = [...new Set((data ?? []).map((d) => d.orderId as string))];
      const orderMap: Record<string, string> = {};
      if (orderIds.length > 0) {
        const { data: orderRows } = await supabase
          .from("orders")
          .select("id, orderNumber")
          .in("id", orderIds);
        (orderRows ?? []).forEach((o: { id: string; orderNumber: string }) => {
          orderMap[o.id] = o.orderNumber;
        });
      }

      setDisputes(
        (data ?? []).map((d) => ({
          id: d.id as string,
          orderId: d.orderId as string,
          orderNumber: orderMap[d.orderId as string],
          subject: d.subject as string,
          description: d.description as string,
          protectionReason: d.protectionReason as string | null,
          status: d.status as Dispute["status"],
          resolution: d.resolution as string | null,
          resolutionType: d.resolutionType as string | null,
          createdAt: d.createdAt as string,
        }))
      );
    } catch {
      toast({ title: "Failed to load disputes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void fetchDisputes(); }, [fetchDisputes]);

  const openNewDisputeDialog = async () => {
    if (!user?.id) return;
    // Load eligible orders (paid, shipped, or delivered) for dispute
    const { data } = await supabase
      .from("orders")
      .select("id, orderNumber")
      .eq("buyerId", user.id)
      .in("status", ["paid", "shipped", "delivered", "completed"])
      .order("createdAt", { ascending: false })
      .limit(50);
    setOrders((data ?? []) as BuyerOrder[]);
    setForm({ orderId: "", subject: "", description: "", protectionReason: "" });
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    if (!user?.id || !form.orderId || !form.subject.trim() || !form.description.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Fetch sellerId from the order
      const { data: order } = await supabase
        .from("orders")
        .select("sellerId")
        .eq("id", form.orderId)
        .single<{ sellerId: string }>();

      if (!order) throw new Error("Order not found");

      const { error } = await supabase.from("disputes").insert({
        orderId: form.orderId,
        buyerId: user.id,
        sellerId: order.sellerId,
        subject: form.subject.trim(),
        description: form.description.trim(),
        protectionReason: form.protectionReason || null,
      });
      if (error) throw error;

      toast({ title: "Dispute opened", description: "We will review your case within 2–3 business days." });
      setOpenDialog(false);
      void fetchDisputes();
    } catch (err: unknown) {
      toast({ title: "Failed to open dispute", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Disputes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Raise and track disputes for your orders.
          </p>
        </div>
        <Button onClick={() => void openNewDisputeDialog()} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Open Dispute
        </Button>
      </div>

      {/* Notice */}
      <div className="rounded-lg bg-primary-soft border border-primary/40 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary">Dispute process</p>
          <p className="text-xs text-primary mt-0.5">
            Eligible paid or fulfilled orders can be submitted for review. Our team will review your case and
            contact both parties within 2–3 business days. Funds remain subject to the applicable payment and dispute process until resolution.
          </p>
        </div>
      </div>

      {/* Disputes list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : disputes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground opacity-30 mb-3" />
          <p className="text-sm font-medium text-foreground">No disputes yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            If you have a problem with an order, click <strong>Open Dispute</strong> above to start the process.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => {
            const cfg = statusConfig[dispute.status] ?? statusConfig.open;
            return (
              <button
                key={dispute.id}
                type="button"
                onClick={() => setSelected(dispute)}
                className="w-full text-left rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors flex items-start gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">{dispute.subject}</p>
                    <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                  </div>
                  {dispute.orderNumber && (
                    <p className="text-xs text-muted-foreground mt-0.5">Order #{dispute.orderNumber}</p>
                  )}
                  {dispute.protectionReason && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {protectionReasonLabels[dispute.protectionReason] ?? dispute.protectionReason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(dispute.createdAt)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.subject}</DialogTitle>
              <DialogDescription>
                {selected.orderNumber ? `Order #${selected.orderNumber}` : "Dispute details"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`mt-0.5 text-xs ${(statusConfig[selected.status] ?? statusConfig.open).className}`}>
                    {(statusConfig[selected.status] ?? statusConfig.open).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opened</p>
                  <p className="font-medium text-foreground">{formatDate(selected.createdAt)}</p>
                </div>
                {selected.protectionReason && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Reason</p>
                    <p className="font-medium text-foreground">
                      {protectionReasonLabels[selected.protectionReason] ?? selected.protectionReason}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <div className="rounded-lg bg-muted p-3 text-sm text-foreground whitespace-pre-wrap">
                  {selected.description}
                </div>
              </div>
              {selected.resolution && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Resolution</p>
                  <div className="rounded-lg bg-emerald-50 border border-success/40 p-3 text-sm text-emerald-800">
                    {selected.resolution}
                    {selected.resolutionType && (
                      <p className="text-xs text-emerald-600 mt-1 capitalize">
                        {selected.resolutionType.replace(/_/g, " ")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Open new dispute dialog */}
      <Dialog open={openDialog} onOpenChange={(open) => { if (!open) setOpenDialog(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Open a Dispute</DialogTitle>
            <DialogDescription>
              Describe the issue with your order. Our team will review it within 2–3 business days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="dispute-order">Order *</Label>
              <Select
                value={form.orderId}
                onValueChange={(v) => setForm((f) => ({ ...f, orderId: v }))}
              >
                <SelectTrigger id="dispute-order" className="mt-1.5">
                  <SelectValue placeholder="Select the order…" />
                </SelectTrigger>
                <SelectContent>
                  {orders.length === 0 && (
                    <SelectItem value="__none__" disabled>No eligible orders found</SelectItem>
                  )}
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>Order #{o.orderNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dispute-reason">Reason</Label>
              <Select
                value={form.protectionReason}
                onValueChange={(v) => setForm((f) => ({ ...f, protectionReason: v }))}
              >
                <SelectTrigger id="dispute-reason" className="mt-1.5">
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(protectionReasonLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dispute-subject">Subject *</Label>
              <input
                id="dispute-subject"
                type="text"
                maxLength={200}
                placeholder="e.g. Item arrived damaged"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="dispute-desc">Description *</Label>
              <Textarea
                id="dispute-desc"
                rows={4}
                placeholder="Please describe the issue in detail…"
                className="mt-1.5 resize-none"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerDisputes;
