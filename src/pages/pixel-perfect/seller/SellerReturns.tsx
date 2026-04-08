import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Search, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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

  const renderTable = (data: Return[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Return ID</TableHead>
          <TableHead className="hidden sm:table-cell">Order</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Date</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading returns…</TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No returns found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((r) => {
            const sc = statusConfig[r.status] ?? statusConfig["requested"];
            return (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-sm">{r.id.slice(0, 8).toUpperCase()}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{r.orderId.slice(0, 8)}</TableCell>
                <TableCell className="text-sm max-w-[180px] truncate">{r.reason}</TableCell>
                <TableCell className="font-semibold text-sm">
                  {r.refundAmount != null ? `£${r.refundAmount.toLocaleString()}` : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSelected(r); }}>
                    {r.status === "requested" ? "Review" : "View"}
                  </Button>
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
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Returns</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? "Loading…" : `${returns.length} return requests · ${byStatus("requested").length} pending review`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending Review", count: byStatus("requested").length, icon: AlertCircle, color: "text-amber-600 bg-amber-500/10" },
          { label: "Approved / In Progress", count: byStatus("approved").length, icon: Clock, color: "text-blue-600 bg-blue-500/10" },
          { label: "Completed", count: byStatus("completed").length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
          { label: "Rejected", count: byStatus("rejected").length, icon: XCircle, color: "text-red-600 bg-red-500/10" },
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
          <Input placeholder="Search returns..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="requested">Pending</TabsTrigger>
          <TabsTrigger value="approved">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(filtered)}</div></CardContent></Card></TabsContent>
        <TabsContent value="requested"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(byStatus("requested"))}</div></CardContent></Card></TabsContent>
        <TabsContent value="approved"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(byStatus("approved"))}</div></CardContent></Card></TabsContent>
        <TabsContent value="completed"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(byStatus("completed"))}</div></CardContent></Card></TabsContent>
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
