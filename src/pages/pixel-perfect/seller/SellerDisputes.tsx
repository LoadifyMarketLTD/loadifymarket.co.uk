import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronRight, Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";

interface SellerDispute {
  id: string;
  orderId: string;
  orderNumber: string | null;
  subject: string;
  description: string;
  protectionReason: string | null;
  status: "open" | "in_review" | "resolved" | "closed";
  sellerResponse: string | null;
  sellerRespondedAt: string | null;
  escalatedAt: string | null;
  resolution: string | null;
  createdAt: string;
}

const statusLabel: Record<string, string> = {
  open: "Open",
  in_review: "In Review",
  resolved: "Resolved",
  closed: "Closed",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SellerDisputes() {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<SellerDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SellerDispute | null>(null);
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("disputes")
        .select("id, orderId, subject, description, protectionReason, status, sellerResponse, sellerRespondedAt, escalatedAt, resolution, createdAt")
        .eq("sellerId", user.id)
        .order("createdAt", { ascending: false });
      if (error) throw error;

      const orderIds = [...new Set((data ?? []).map((row) => String(row.orderId)))];
      const orderMap = new Map<string, string>();
      if (orderIds.length > 0) {
        const { data: orders } = await supabase
          .from("orders")
          .select("id, orderNumber")
          .in("id", orderIds);
        (orders ?? []).forEach((order: { id: string; orderNumber: string }) => {
          orderMap.set(order.id, order.orderNumber);
        });
      }

      setRows((data ?? []).map((row) => ({
        id: String(row.id),
        orderId: String(row.orderId),
        orderNumber: orderMap.get(String(row.orderId)) ?? null,
        subject: String(row.subject ?? "Dispute"),
        description: String(row.description ?? ""),
        protectionReason: row.protectionReason ? String(row.protectionReason) : null,
        status: row.status as SellerDispute["status"],
        sellerResponse: row.sellerResponse ? String(row.sellerResponse) : null,
        sellerRespondedAt: row.sellerRespondedAt ? String(row.sellerRespondedAt) : null,
        escalatedAt: row.escalatedAt ? String(row.escalatedAt) : null,
        resolution: row.resolution ? String(row.resolution) : null,
        createdAt: String(row.createdAt),
      })));
    } catch (error) {
      toast({ title: "Failed to load disputes", description: (error as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  const open = (row: SellerDispute) => {
    setSelected(row);
    setResponse(row.sellerResponse ?? "");
  };

  const submitResponse = async () => {
    if (!selected || response.trim().length < 10 || submitting) return;
    setSubmitting(true);
    try {
      const result = await authorizedFetch("/.netlify/functions/dispute-action", {
        method: "POST",
        body: JSON.stringify({
          disputeId: selected.id,
          action: "respond",
          response: response.trim(),
          evidence: [],
        }),
      });
      const payload = await result.json() as { error?: string };
      if (!result.ok) throw new Error(payload.error || "Seller response could not be submitted.");
      toast({ title: "Response submitted", description: "The buyer has been notified." });
      setSelected(null);
      await load();
    } catch (error) {
      toast({ title: "Response failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" />
          Disputes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review buyer disputes, respond, and track escalated cases.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5" />
        <p className="text-sm text-amber-900">
          Reply promptly. Buyers may escalate eligible cases to Loadify after the response window.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">No disputes require attention.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <button key={row.id} type="button" onClick={() => open(row)} className="w-full text-left rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground truncate">{row.subject}</p>
                    <Badge variant="outline">{statusLabel[row.status] ?? row.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {row.orderNumber ? `Order #${row.orderNumber}` : "Order dispute"} · {formatDate(row.createdAt)}
                  </p>
                  {row.sellerResponse ? (
                    <p className="text-xs text-emerald-700 mt-1">Response submitted</p>
                  ) : (
                    <p className="text-xs text-amber-700 mt-1">Awaiting your response</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(openDialog) => { if (!openDialog) setSelected(null); }}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.subject}</DialogTitle>
              <DialogDescription>{selected.orderNumber ? `Order #${selected.orderNumber}` : "Dispute details"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className="mt-1">{statusLabel[selected.status] ?? selected.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opened</p>
                  <p className="font-medium text-foreground mt-1">{formatDate(selected.createdAt)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Buyer description</p>
                <div className="rounded-lg bg-muted p-3 text-sm text-foreground whitespace-pre-wrap">{selected.description}</div>
              </div>
              {selected.protectionReason && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm font-medium text-foreground">{selected.protectionReason.replace(/_/g, " ")}</p>
                </div>
              )}
              {selected.sellerResponse ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Your response</p>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 whitespace-pre-wrap">
                    {selected.sellerResponse}
                    <p className="text-xs text-blue-700 mt-1">Submitted {formatDate(selected.sellerRespondedAt)}</p>
                  </div>
                </div>
              ) : ["open", "in_review"].includes(selected.status) ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Your response</p>
                  <Textarea
                    rows={5}
                    maxLength={4000}
                    value={response}
                    onChange={(event) => setResponse(event.target.value)}
                    placeholder="Explain your position and any action already taken."
                  />
                  <p className="text-xs text-muted-foreground">Minimum 10 characters.</p>
                  <Button className="w-full" disabled={submitting || response.trim().length < 10} onClick={() => void submitResponse()}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Submit response
                  </Button>
                </div>
              ) : null}
              {selected.escalatedAt && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Escalated to Loadify on {formatDate(selected.escalatedAt)}.
                </div>
              )}
              {selected.resolution && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Resolution</p>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 whitespace-pre-wrap">
                    {selected.resolution}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
