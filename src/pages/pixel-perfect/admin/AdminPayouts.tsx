/**
 * AdminPayouts.tsx
 *
 * Admin payout approval panel.
 *
 * Reads from `payout_requests` table. Each row represents a seller's request
 * to be paid their available balance.
 *
 * Privileged payout mutations are routed through the authenticated Netlify
 * admin boundary; the browser no longer executes financial admin RPCs directly.
 *
 * Lifecycle: requested → approved → paid  (or  requested | approved → rejected)
 */

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, XCircle, Banknote, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { toast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PayoutRequest {
  id: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  currency: string;
  status: "requested" | "approved" | "rejected" | "paid" | "cancelled";
  notes: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

type AdminPayoutAction = "approve" | "complete" | "reject";

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string }> = {
  requested: {
    label: "Requested",
    className: "border-primary/40 text-primary bg-primary/10",
  },
  approved: {
    label: "Approved",
    className: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  },
  paid: {
    label: "Paid",
    className: "border-emerald-500/30 text-success bg-success/10",
  },
  rejected: {
    label: "Rejected",
    className: "border-slate-200 text-slate-400",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-slate-200 text-slate-400",
  },
};

const fmtGBP = (v: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

async function runAdminPayoutAction(
  action: AdminPayoutAction,
  requestId: string,
  notes?: string | null,
): Promise<void> {
  const response = await authorizedFetch('/.netlify/functions/admin-payout-action', {
    method: 'POST',
    body: JSON.stringify({ action, requestId, notes: notes ?? null }),
  });

  let payload: { error?: string } | null = null;
  try {
    payload = await response.json() as { error?: string };
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || 'Payout action failed');
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const AdminPayouts = () => {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<PayoutRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from("payout_requests")
        .select("id, sellerId, amount, currency, status, notes, createdAt, reviewedAt")
        .order("createdAt", { ascending: false })
        .limit(200);

      if (qErr) throw qErr;

      const rows = data ?? [];

      // Resolve seller display names
      const sellerIds = [...new Set(rows.map((r) => r.sellerId as string))];
      const nameMap: Record<string, string> = {};

      if (sellerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("seller_profiles")
          .select('"userId", "businessName"')
          .in('"userId"', sellerIds);

        (profiles ?? []).forEach((p: { userId?: string; businessName?: string }) => {
          if (p.userId) nameMap[p.userId] = p.businessName || p.userId.slice(0, 8);
        });
      }

      setRequests(
        rows.map((r) => ({
          id: r.id as string,
          sellerId: r.sellerId as string,
          sellerName: nameMap[r.sellerId as string] ?? (r.sellerId as string).slice(0, 8),
          amount: r.amount as number,
          currency: (r.currency as string) || "GBP",
          status: r.status as PayoutRequest["status"],
          notes: r.notes as string | null,
          createdAt: r.createdAt as string,
          reviewedAt: r.reviewedAt as string | null,
        }))
      );
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load payout requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const approve = async (req: PayoutRequest) => {
    setActionId(req.id);
    try {
      await runAdminPayoutAction("approve", req.id);
      setRequests((prev) =>
        prev.map((r) => r.id === req.id ? { ...r, status: "approved" } : r)
      );
      toast({ title: "Payout approved", description: `${fmtGBP(req.amount)} for ${req.sellerName}` });
    } catch (err: unknown) {
      toast({ title: "Approve failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  const complete = async (req: PayoutRequest) => {
    setActionId(req.id);
    try {
      await runAdminPayoutAction("complete", req.id);
      setRequests((prev) =>
        prev.map((r) => r.id === req.id ? { ...r, status: "paid" } : r)
      );
      toast({ title: "Payout completed", description: `${fmtGBP(req.amount)} marked as paid` });
    } catch (err: unknown) {
      toast({ title: "Complete failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setActionId(rejectTarget.id);
    try {
      await runAdminPayoutAction("reject", rejectTarget.id, rejectNotes.trim() || null);
      const rejectedId = rejectTarget.id;
      setRequests((prev) =>
        prev.map((r) => r.id === rejectedId ? { ...r, status: "rejected", notes: rejectNotes.trim() || r.notes } : r)
      );
      toast({ title: "Payout rejected", description: `${fmtGBP(rejectTarget.amount)} returned to seller balance` });
      setRejectTarget(null);
      setRejectNotes("");
    } catch (err: unknown) {
      toast({ title: "Reject failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  // ── Filter / tabs ──────────────────────────────────────────────────────────

  const filtered = requests.filter((r) =>
    r.sellerName.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (s: string) => filtered.filter((r) => r.status === s);
  const pending = filtered.filter((r) => ["requested", "approved"].includes(r.status));

  const totalPending = pending.reduce((sum, r) => sum + r.amount, 0);
  const totalApproved = byStatus("approved").reduce((sum, r) => sum + r.amount, 0);

  // ── Render table ───────────────────────────────────────────────────────────

  const renderTable = (rows: PayoutRequest[]) => (
    <Table>
      <TableHeader>
        <TableRow style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Seller</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Amount</TableHead>
          <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Requested</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Status</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase text-right" style={{ color: "rgba(148,163,184,0.85)" }}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-10 text-sm" style={{ color: "rgba(100,116,139,0.65)" }}>
              No payout requests found
            </TableCell>
          </TableRow>
        ) : (
          rows.map((req) => {
            const cfg = statusConfig[req.status] ?? statusConfig.requested;
            const busy = actionId === req.id;
            return (
              <TableRow key={req.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <TableCell className="font-medium text-white">{req.sellerName}</TableCell>
                <TableCell className="font-semibold text-white">{fmtGBP(req.amount)}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>
                  {fmtDate(req.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    {req.status === "requested" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          className="h-7 px-2 text-xs text-success hover:text-emerald-300 hover:bg-success/10"
                          onClick={() => approve(req)}
                          title="Approve payout"
                        >
                          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {!busy && "Approve"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          className="h-7 px-2 text-xs text-danger hover:text-red-300 hover:bg-danger/100/10"
                          onClick={() => { setRejectTarget(req); setRejectNotes(""); }}
                          title="Reject payout"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {req.status === "approved" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          onClick={() => complete(req)}
                          title="Mark as paid"
                        >
                          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Banknote className="h-3 w-3 mr-1" />}
                          {!busy && "Mark Paid"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          className="h-7 px-2 text-xs text-danger hover:text-red-300 hover:bg-danger/100/10"
                          onClick={() => { setRejectTarget(req); setRejectNotes(""); }}
                          title="Reject payout"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {["paid", "rejected", "cancelled"].includes(req.status) && (
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  // ── Page ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Payout Requests</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.85)" }}>
            Review and approve seller payout requests.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRequests}
          disabled={loading}
          className="border-white/10 text-slate-400 hover:bg-white/5 self-start sm:self-auto"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", value: byStatus("requested").length, accent: "text-primary" },
          { label: "Approved", value: byStatus("approved").length, accent: "text-blue-400" },
          { label: "Pending GBP", value: fmtGBP(totalPending), accent: "text-primary" },
          { label: "Approved GBP", value: fmtGBP(totalApproved), accent: "text-blue-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4"
            style={{ border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p className="text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>{stat.label}</p>
            <p className={`text-xl font-bold mt-1 ${stat.accent}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4 text-sm text-danger" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by seller or ID…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <TabsTrigger value="pending" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">
            Pending <Badge variant="outline" className="ml-2 text-xs border-white/20 text-slate-500">{pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">
            Approved
          </TabsTrigger>
          <TabsTrigger value="paid" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">
            Paid
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">
            All
          </TabsTrigger>
        </TabsList>

        {(["pending", "approved", "paid", "all"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "rgba(100,116,139,0.65)" }} />
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="px-2 py-2 overflow-x-auto">
                  {renderTable(
                    tab === "pending" ? pending :
                    tab === "all" ? filtered :
                    byStatus(tab)
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectNotes(""); } }}>
        {rejectTarget && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reject Payout Request</DialogTitle>
              <DialogDescription>
                Rejecting {fmtGBP(rejectTarget.amount)} for {rejectTarget.sellerName}. The amount will be returned to their available balance.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="reject-notes">Reason (optional)</Label>
                <Textarea
                  id="reject-notes"
                  placeholder="Explain why this payout is being rejected…"
                  className="mt-1.5 resize-none"
                  rows={3}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectNotes(""); }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={actionId === rejectTarget.id}
                onClick={reject}
              >
                {actionId === rejectTarget.id ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Rejecting…</>
                ) : (
                  "Confirm Reject"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminPayouts;
