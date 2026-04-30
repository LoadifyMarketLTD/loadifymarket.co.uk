import { useState, useEffect, useCallback } from "react";
import { FileText, Search, Clock, CheckCircle2, MessageSquare, Mail } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";
import type { RFQRequest } from "@/types";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "New", className: "bg-blue-500/10 text-blue-700" },
  replied: { label: "Replied", className: "bg-emerald-500/10 text-emerald-700" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const SellerRFQ = () => {
  const { user } = useAuthStore();
  const [rfqs, setRfqs] = useState<RFQRequest[]>([]);
  // Set of rfqIds that *this seller* has already replied to (from rfq_responses table)
  const [repliedIds, setRepliedIds] = useState<Set<string>>(new Set());
  // Map from rfqId → responseId for this seller (needed for withdraw)
  const [responseIdByRfq, setResponseIdByRfq] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RFQRequest | null>(null);
  const [quoteNote, setQuoteNote] = useState("");
  const [sending, setSending] = useState(false);
  const [rfqError, setRfqError] = useState("");
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Load all open RFQ requests (platform-wide marketplace board — buyers post
      // to all sellers; filtering is handled via per-seller reply tracking below)
      const [rfqsRes, responsesRes] = await Promise.all([
        supabase
          .from("rfq_requests")
          .select("*")
          .eq("status", "pending")
          .order("createdAt", { ascending: false }),
        // Load only this seller's existing responses to track per-seller replied status
        supabase
          .from("rfq_responses")
          .select("id, rfqId")
          .eq("sellerId", user.id)
          .eq("status", "submitted"),
      ]);
      setRfqs((rfqsRes.data ?? []) as RFQRequest[]);
      const responseRows = (responsesRes.data ?? []) as { id: string; rfqId: string }[];
      setRepliedIds(new Set(responseRows.map((r) => r.rfqId)));
      const idMap: Record<string, string> = {};
      for (const r of responseRows) idMap[r.rfqId] = r.id;
      setResponseIdByRfq(idMap);
    } catch {
      toast({ title: "Could not load quote requests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = rfqs.filter((q) => {
    const query = search.toLowerCase();
    return (
      q.id.toLowerCase().includes(query) ||
      q.product_name.toLowerCase().includes(query) ||
      q.buyer_email.toLowerCase().includes(query)
    );
  });

  // Per-seller split: "pending" = not yet replied by this seller; "replied" = this seller has responded
  const pending = filtered.filter((q) => !repliedIds.has(q.id));
  const replied = filtered.filter((q) => repliedIds.has(q.id));

  const handleWithdrawQuote = async (rfqId: string) => {
    const responseId = responseIdByRfq[rfqId];
    if (!responseId || !user?.id) return;
    setWithdrawing(responseId);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      const res = await fetch("/.netlify/functions/rfq", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ op: "withdraw", responseId }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error((payload as { error?: string }).error ?? `Server error ${res.status}`);
      }
      // Update local state: remove from replied set and id map
      setRepliedIds((prev) => { const next = new Set(prev); next.delete(rfqId); return next; });
      setResponseIdByRfq((prev) => { const next = { ...prev }; delete next[rfqId]; return next; });
      setSelected(null);
      toast({ title: "Quote withdrawn", description: "Your quote has been withdrawn from this request." });
    } catch (e) {
      toast({ title: "Could not withdraw quote", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setWithdrawing(null);
    }
  };

  const handleOpenEmailClient = async () => {    if (!selected || !quoteNote.trim() || !user?.id) return;
    setSending(true);
    setRfqError("");
    try {
      // Record the response via serverless function so rfqSystem flag is enforced.
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      const res = await fetch("/.netlify/functions/rfq", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          op: "respond",
          rfqId: selected.id,
          quotedPrice: 0,
          message: quoteNote.trim(),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error((payload as { error?: string }).error ?? `Server error ${res.status}`);
      }

      // Update local state immediately so the tab/badge count updates without a reload
      setRepliedIds((prev) => new Set([...prev, selected.id]));

      const buyerEmail = selected.buyer_email;
      const subject = encodeURIComponent(`Re: Quote Request – ${selected.product_name}`);
      const body = encodeURIComponent(quoteNote);

      setSelected(null);
      setQuoteNote("");

      // Open email client — the mailto: link must NOT encode the email address itself
      window.location.href = `mailto:${buyerEmail}?subject=${subject}&body=${body}`;
    } catch (e) {
      setRfqError(e instanceof Error ? e.message : "Failed to record reply.");
    } finally {
      setSending(false);
    }
  };

  const renderTable = (data: RFQRequest[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>RFQ ID</TableHead>
          <TableHead>Buyer Email</TableHead>
          <TableHead className="hidden sm:table-cell">Product</TableHead>
          <TableHead className="hidden md:table-cell">Qty</TableHead>
          <TableHead className="hidden lg:table-cell">Budget</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Received</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading RFQ requests…</TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No quote requests found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((q) => {
            const sellerReplied = repliedIds.has(q.id);
            const sc = sellerReplied ? statusConfig.replied : statusConfig.pending;
            return (
              <TableRow key={q.id}>
                <TableCell className="font-medium text-sm">{q.id.slice(0, 8).toUpperCase()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{q.buyer_email}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[180px] truncate">{q.product_name}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{q.quantity}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs font-medium text-foreground">{q.estimated_budget}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDate(q.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => { setSelected(q); setQuoteNote(""); setRfqError(""); }}
                  >
                    {sellerReplied ? "View" : "Reply"}
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
        <h1 className="font-display text-2xl font-bold text-foreground">RFQ / Quotes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? "Loading…" : `${rfqs.length} open quote requests · ${pending.length} awaiting your response`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "New Requests", count: pending.length, icon: MessageSquare, color: "text-blue-600 bg-blue-500/10" },
          { label: "You Replied", count: replied.length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
          { label: "Total", count: filtered.length, icon: FileText, color: "text-muted-foreground bg-muted" },
          { label: "This Month", count: filtered.filter((q) => new Date(q.created_at).getMonth() === new Date().getMonth()).length, icon: Clock, color: "text-amber-600 bg-amber-500/10" },
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
          <Input placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="pending">New <Badge variant="secondary" className="ml-2 text-xs">{pending.length}</Badge></TabsTrigger>
          <TabsTrigger value="replied">You Replied</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(filtered)}</div></CardContent></Card></TabsContent>
        <TabsContent value="pending"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(pending)}</div></CardContent></Card></TabsContent>
        <TabsContent value="replied"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(replied)}</div></CardContent></Card></TabsContent>
      </Tabs>

      {/* RFQ Detail / Reply Dialog */}
      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setRfqError(""); }}>
        {selected && (() => {
          const sellerReplied = repliedIds.has(selected.id);
          return (
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{selected.id.slice(0, 8).toUpperCase()}</DialogTitle>
                <DialogDescription>Quote request from {selected.buyer_email}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Buyer Email</span><p className="font-medium text-foreground">{selected.buyer_email}</p></div>
                  <div><span className="text-muted-foreground">Destination</span><p className="font-medium text-foreground">{selected.destination_country}</p></div>
                  <div><span className="text-muted-foreground">Product</span><p className="font-medium text-foreground">{selected.product_name}</p></div>
                  <div><span className="text-muted-foreground">Quantity</span><p className="font-medium text-foreground">{selected.quantity}</p></div>
                  <div><span className="text-muted-foreground">Budget</span><p className="font-semibold text-foreground">{selected.estimated_budget}</p></div>
                  <div><span className="text-muted-foreground">Received</span><p className="font-medium text-foreground">{formatDate(selected.created_at)}</p></div>
                </div>
                {selected.message && (
                  <div className="rounded-lg bg-muted/50 border border-border p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">BUYER MESSAGE</p>
                    <p className="text-sm text-foreground">{selected.message}</p>
                  </div>
                )}
                {!sellerReplied ? (
                  <div className="space-y-3">
                    {rfqError && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{rfqError}</div>
                    )}
                    <div>
                      <Label className="text-xs">Your Reply / Quote</Label>
                      <Textarea
                        placeholder="Include your price, delivery terms, lead time, etc."
                        value={quoteNote}
                        onChange={(e) => setQuoteNote(e.target.value)}
                        rows={4}
                        className="mt-1"
                      />
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                      <p className="text-xs text-amber-800">
                        <strong>How this works:</strong> Clicking "Open Email Client" saves your reply and opens your email client pre-filled with the buyer's address and message. The request is marked as replied once your email client opens. If no email client is configured, copy the buyer's address ({selected.buyer_email}) and contact them directly.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">YOU HAVE REPLIED</p>
                    <p className="text-sm text-muted-foreground">Your reply to this request has been recorded. The buyer was contacted via email.</p>
                  </div>
                )}
              </div>
              {!sellerReplied ? (
                <DialogFooter className="flex gap-2">
                  <Button variant="outline" onClick={() => { setSelected(null); setRfqError(""); }}>Cancel</Button>
                  <Button disabled={!quoteNote.trim() || sending} onClick={handleOpenEmailClient}>
                    <Mail className="h-4 w-4 mr-1" /> {sending ? "Saving…" : "Open Email Client"}
                  </Button>
                </DialogFooter>
              ) : (
                <DialogFooter className="flex gap-2">
                  <Button variant="outline" onClick={() => { setSelected(null); setRfqError(""); }}>Close</Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={withdrawing === responseIdByRfq[selected.id]}
                    onClick={() => handleWithdrawQuote(selected.id)}
                  >
                    {withdrawing === responseIdByRfq[selected.id] ? "Withdrawing…" : "Withdraw Quote"}
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
};

export default SellerRFQ;
