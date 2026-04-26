import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert, Search, Eye, CheckCircle2, Loader2, MoreHorizontal,
} from "lucide-react";
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface Dispute {
  id: string;
  orderId: string;
  orderNumber?: string;
  buyerEmail: string;
  sellerEmail: string;
  subject: string;
  description: string;
  protectionReason: string | null;
  status: "open" | "in_review" | "resolved" | "closed";
  resolution: string | null;
  resolutionType: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  open:      { label: "Open",      className: "border-amber-500/30 text-amber-600 bg-amber-50" },
  in_review: { label: "In Review", className: "border-blue-500/30 text-blue-600 bg-blue-50" },
  resolved:  { label: "Resolved",  className: "border-emerald-500/30 text-emerald-700 bg-emerald-50" },
  closed:    { label: "Closed",    className: "border-slate-300 text-slate-500 bg-slate-50" },
};

const protectionReasonLabels: Record<string, string> = {
  item_not_received:     "Item Not Received",
  not_as_described:      "Not As Described",
  item_damaged:          "Item Damaged",
  defective_product:     "Defective Product",
  seller_not_responding: "Seller Not Responding",
  other:                 "Other",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const AdminDisputes = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("open");
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Resolution dialog
  const [resolveTarget, setResolveTarget] = useState<Dispute | null>(null);
  const [resolveForm, setResolveForm] = useState({ resolution: "", resolutionType: "" });

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("disputes")
        .select("id, orderId, buyerId, sellerId, subject, description, protectionReason, status, resolution, resolutionType, createdAt")
        .order("createdAt", { ascending: false })
        .limit(200);

      if (error) throw error;

      const rows = data ?? [];

      // Resolve order numbers
      const orderIds = [...new Set(rows.map((r) => r.orderId as string))];
      const orderMap: Record<string, string> = {};
      if (orderIds.length > 0) {
        const { data: orders } = await supabase
          .from("orders")
          .select("id, orderNumber")
          .in("id", orderIds);
        (orders ?? []).forEach((o: { id: string; orderNumber: string }) => {
          orderMap[o.id] = o.orderNumber;
        });
      }

      // Resolve user emails
      const userIds = [
        ...new Set([
          ...rows.map((r) => r.buyerId as string),
          ...rows.map((r) => r.sellerId as string),
        ]),
      ];
      const emailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, email")
          .in("id", userIds);
        (users ?? []).forEach((u: { id: string; email: string }) => {
          emailMap[u.id] = u.email;
        });
      }

      setDisputes(
        rows.map((r) => ({
          id: r.id as string,
          orderId: r.orderId as string,
          orderNumber: orderMap[r.orderId as string],
          buyerEmail: emailMap[r.buyerId as string] ?? (r.buyerId as string).slice(0, 8),
          sellerEmail: emailMap[r.sellerId as string] ?? (r.sellerId as string).slice(0, 8),
          subject: r.subject as string,
          description: r.description as string,
          protectionReason: r.protectionReason as string | null,
          status: r.status as Dispute["status"],
          resolution: r.resolution as string | null,
          resolutionType: r.resolutionType as string | null,
          createdAt: r.createdAt as string,
        }))
      );
    } catch (err: unknown) {
      toast({ title: "Failed to load disputes", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchDisputes(); }, [fetchDisputes]);

  const updateStatus = async (id: string, newStatus: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from("disputes")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      setDisputes((prev) => prev.map((d) => d.id === id ? { ...d, status: newStatus as Dispute["status"] } : d));
      if (selected?.id === id) setSelected((s) => s ? { ...s, status: newStatus as Dispute["status"] } : s);
    } catch (err: unknown) {
      toast({ title: "Failed to update status", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const submitResolution = async () => {
    if (!resolveTarget) return;
    if (!resolveForm.resolution.trim() || !resolveForm.resolutionType) {
      toast({ title: "Please fill in resolution and type", variant: "destructive" });
      return;
    }
    setActionLoading(resolveTarget.id);
    try {
      const { error } = await supabase
        .from("disputes")
        .update({
          status: "resolved",
          resolution: resolveForm.resolution.trim(),
          resolutionType: resolveForm.resolutionType,
        })
        .eq("id", resolveTarget.id);
      if (error) throw error;
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === resolveTarget.id
            ? { ...d, status: "resolved", resolution: resolveForm.resolution.trim(), resolutionType: resolveForm.resolutionType }
            : d
        )
      );
      toast({ title: "Dispute resolved" });
      setResolveTarget(null);
      setResolveForm({ resolution: "", resolutionType: "" });
    } catch (err: unknown) {
      toast({ title: "Failed to resolve dispute", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = disputes.filter(
    (d) =>
      d.subject.toLowerCase().includes(search.toLowerCase()) ||
      d.buyerEmail.toLowerCase().includes(search.toLowerCase()) ||
      d.sellerEmail.toLowerCase().includes(search.toLowerCase()) ||
      (d.orderNumber ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (s: string) => filtered.filter((d) => d.status === s);
  const openCount = disputes.filter((d) => d.status === "open" || d.status === "in_review").length;

  const renderTable = (rows: Dispute[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead className="hidden sm:table-cell">Buyer</TableHead>
          <TableHead className="hidden md:table-cell">Reason</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-10">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </TableCell>
          </TableRow>
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
              <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No disputes found.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((d) => {
            const cfg = statusConfig[d.status] ?? statusConfig.open;
            const busy = actionLoading === d.id;
            return (
              <TableRow key={d.id}>
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{d.subject}</p>
                  {d.orderNumber && (
                    <p className="text-xs text-muted-foreground">Order #{d.orderNumber}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</p>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                  {d.buyerEmail}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[140px] truncate">
                  {d.protectionReason ? (protectionReasonLabels[d.protectionReason] ?? d.protectionReason) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelected(d)}>
                        <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                      </DropdownMenuItem>
                      {d.status === "open" && (
                        <DropdownMenuItem onClick={() => void updateStatus(d.id, "in_review")}>
                          <ShieldAlert className="h-3.5 w-3.5 mr-2" /> Mark In Review
                        </DropdownMenuItem>
                      )}
                      {(d.status === "open" || d.status === "in_review") && (
                        <DropdownMenuItem onClick={() => { setResolveTarget(d); setResolveForm({ resolution: "", resolutionType: "" }); }}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Resolve
                        </DropdownMenuItem>
                      )}
                      {d.status === "resolved" && (
                        <DropdownMenuItem onClick={() => void updateStatus(d.id, "closed")}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Close
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6" style={{ background: "#f8fafc", minHeight: "100%" }}>
      {/* Header */}
      <div className="pb-2" style={{ borderBottom: "1px solid rgba(148,163,184,0.3)" }}>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dispute Center</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(71,85,105,0.85)" }}>
          {disputes.length} disputes · {openCount} open
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Open",      count: byStatus("open").length,      color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
          { label: "In Review", count: byStatus("in_review").length, color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
          { label: "Resolved",  count: byStatus("resolved").length,  color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
          { label: "Closed",    count: byStatus("closed").length,    color: "rgba(71,85,105,0.8)", bg: "rgba(148,163,184,0.3)" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-4"
            style={{ background: "#ffffff", border: "1px solid rgba(148,163,184,0.35)", boxShadow: "0 4px 24px rgba(15,23,42,0.08)" }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: stat.bg }}>
              <ShieldAlert className="h-4 w-4" style={{ color: stat.color }} />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stat.count}</div>
            <p className="text-xs mt-0.5 font-medium" style={{ color: "rgba(71,85,105,0.85)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search disputes…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="open">
            Open <Badge variant="outline" className="ml-2 text-xs">{byStatus("open").length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="in_review">In Review</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        {(["open", "in_review", "resolved", "closed", "all"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid rgba(148,163,184,0.35)" }}>
              <div className="px-2 py-2 overflow-x-auto">
                {renderTable(tab === "all" ? filtered : byStatus(tab))}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

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
                <div>
                  <p className="text-xs text-muted-foreground">Buyer</p>
                  <p className="font-medium text-foreground text-xs truncate">{selected.buyerEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Seller</p>
                  <p className="font-medium text-foreground text-xs truncate">{selected.sellerEmail}</p>
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
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
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
            {(selected.status === "open" || selected.status === "in_review") && (
              <DialogFooter>
                {selected.status === "open" && (
                  <Button variant="outline" onClick={() => { void updateStatus(selected.id, "in_review"); setSelected(null); }}>
                    Mark In Review
                  </Button>
                )}
                <Button onClick={() => { setResolveTarget(selected); setSelected(null); setResolveForm({ resolution: "", resolutionType: "" }); }}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Resolve
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>

      {/* Resolution dialog */}
      <Dialog open={!!resolveTarget} onOpenChange={(open) => { if (!open) setResolveTarget(null); }}>
        {resolveTarget && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Resolve Dispute</DialogTitle>
              <DialogDescription>
                Enter the resolution for: <strong>{resolveTarget.subject}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="res-type">Resolution Type *</Label>
                <Select
                  value={resolveForm.resolutionType}
                  onValueChange={(v) => setResolveForm((f) => ({ ...f, resolutionType: v }))}
                >
                  <SelectTrigger id="res-type" className="mt-1.5">
                    <SelectValue placeholder="Select resolution…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_refund">Full Refund</SelectItem>
                    <SelectItem value="partial_refund">Partial Refund</SelectItem>
                    <SelectItem value="replacement">Replacement</SelectItem>
                    <SelectItem value="rejected">Rejected (No Action)</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn by Buyer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="res-notes">Resolution Notes *</Label>
                <Textarea
                  id="res-notes"
                  rows={3}
                  placeholder="Explain the decision…"
                  className="mt-1.5 resize-none"
                  value={resolveForm.resolution}
                  onChange={(e) => setResolveForm((f) => ({ ...f, resolution: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancel</Button>
              <Button disabled={actionLoading === resolveTarget.id} onClick={() => void submitResolution()}>
                {actionLoading === resolveTarget.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Resolution
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminDisputes;
