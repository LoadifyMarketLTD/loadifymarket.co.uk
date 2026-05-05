import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Search, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import type { Return } from "@/types";

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  requested:  { label: "Requested",  className: "bg-amber-500/10 text-amber-700",   icon: AlertCircle },
  approved:   { label: "Approved",   className: "bg-blue-500/10 text-blue-700",     icon: CheckCircle2 },
  completed:  { label: "Completed",  className: "bg-emerald-500/10 text-emerald-700", icon: CheckCircle2 },
  rejected:   { label: "Rejected",   className: "bg-red-500/10 text-red-700",       icon: XCircle },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const SellerReturns = () => {
  const { user } = useAuthStore();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Return | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("returns")
      .select("*")
      .eq("sellerId", user.id)
      .order("createdAt", { ascending: false });
    setReturns((data ?? []) as Return[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const filtered = returns.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.orderId.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q)
    );
  });

  const byStatus = (status: string) => filtered.filter((r) => r.status === status);

  const handleApprove = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    try {
      const { error: dbError } = await supabase.from("returns").update({ status: "approved" }).eq("id", selected.id);
      if (dbError) { setError(dbError.message); return; }
      // Notify buyer that their return was approved
      await supabase.from("notifications").insert({
        userId: selected.buyerId,
        type: "return",
        title: "Return approved",
        message: `Your return request for order ${selected.orderId.slice(0, 8).toUpperCase()} has been approved.`,
      });
      await load();
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    try {
      const { error: dbError } = await supabase.from("returns").update({ status: "rejected" }).eq("id", selected.id);
      if (dbError) { setError(dbError.message); return; }
      // Notify buyer that their return was rejected
      await supabase.from("notifications").insert({
        userId: selected.buyerId,
        type: "return",
        title: "Return rejected",
        message: `Your return request for order ${selected.orderId.slice(0, 8).toUpperCase()} has been rejected. Please contact support if you have questions.`,
      });
      await load();
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  };

  const renderList = (data: Return[]) => {
    if (loading) return <div className="px-3 py-6 text-center text-muted-foreground text-xs">Loading returns…</div>;
    if (data.length === 0) return (
      <div className="px-3 py-6 text-center text-muted-foreground text-xs">
        <RotateCcw className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
        No returns found.
      </div>
    );
    return (
      <div className="divide-y divide-border">
        {data.map((r) => {
          const sc = statusConfig[r.status] ?? statusConfig["requested"];
          const Icon = sc.icon;
          return (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sc.className}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-foreground">{r.orderId.slice(0, 8).toUpperCase()}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${sc.className}`}>{sc.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{r.reason}</p>
              </div>
              <div className="text-right shrink-0">
                {r.refundAmount != null && (
                  <div className="text-[13px] font-bold text-foreground">£{r.refundAmount.toLocaleString()}</div>
                )}
                <div className="text-[10px] text-muted-foreground">{formatDate(r.createdAt)}</div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="px-3 pt-3 pb-4 sm:p-6 space-y-3 sm:space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-base font-bold text-foreground">Returns</h1>
        <p className="text-[11px] text-muted-foreground">
          {loading ? "Loading…" : `${returns.length} requests · ${byStatus("requested").length} pending`}
        </p>
      </div>

      {/* Compact stats grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Pending", count: byStatus("requested").length, color: "text-amber-500" },
          { label: "Approved", count: byStatus("approved").length, color: "text-blue-500" },
          { label: "Completed", count: byStatus("completed").length, color: "text-emerald-500" },
          { label: "Rejected", count: byStatus("rejected").length, color: "text-red-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-lg border border-border p-2 text-center">
            <div className={`text-lg font-bold ${stat.color}`}>{stat.count}</div>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Search returns..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="h-8">
          <TabsTrigger value="all" className="text-xs h-7">All <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="requested" className="text-xs h-7">Pending</TabsTrigger>
          <TabsTrigger value="approved" className="text-xs h-7">In Progress</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs h-7">Done</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="p-0">{renderList(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="requested"><Card><CardContent className="p-0">{renderList(byStatus("requested"))}</CardContent></Card></TabsContent>
        <TabsContent value="approved"><Card><CardContent className="p-0">{renderList(byStatus("approved"))}</CardContent></Card></TabsContent>
        <TabsContent value="completed"><Card><CardContent className="p-0">{renderList(byStatus("completed"))}</CardContent></Card></TabsContent>
      </Tabs>

      {/* Return Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.id.slice(0, 8).toUpperCase()}</DialogTitle>
              <DialogDescription>Return request for order {selected.orderId.slice(0, 8)}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Reason</span><p className="font-medium text-foreground">{selected.reason}</p></div>
                <div><span className="text-muted-foreground">Refund Amount</span>
                  <p className="font-semibold text-foreground">
                    {selected.refundAmount != null ? `£${selected.refundAmount.toLocaleString()}` : "—"}
                  </p>
                </div>
                <div><span className="text-muted-foreground">Status</span>
                  <p className="font-medium text-foreground capitalize">{selected.status}</p>
                </div>
                <div><span className="text-muted-foreground">Date</span>
                  <p className="font-medium text-foreground">{formatDate(selected.createdAt)}</p>
                </div>
              </div>
              {selected.description && (
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">BUYER NOTES</p>
                  <p className="text-sm text-foreground">{selected.description}</p>
                </div>
              )}
            </div>
            {selected.status === "requested" && (
              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  disabled={submitting}
                  onClick={handleReject}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button disabled={submitting} onClick={handleApprove}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> {submitting ? "Processing…" : "Approve Return"}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default SellerReturns;
