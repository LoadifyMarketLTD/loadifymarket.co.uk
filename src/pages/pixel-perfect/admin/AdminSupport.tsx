import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Search, Clock, CheckCircle2, AlertCircle, Loader2, Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";

interface Ticket {
  id: string;
  subject: string;
  userName: string;
  userEmail: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface DisputeRow {
  id: string;
  orderId: string;
  buyerName: string;
  subject: string;
  protectionReason: string;
  description: string;
  status: string;
  createdAt: string;
}

const disputeStatusConfig: Record<string, { label: string; className: string }> = {
  open:        { label: "Open", className: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  under_review:{ label: "Under Review", className: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
  resolved:    { label: "Resolved", className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
  closed:      { label: "Closed", className: "border-slate-200 text-slate-400" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  in_progress: { label: "In Progress", className: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
  waiting_customer: { label: "Waiting", className: "border-purple-500/30 text-purple-400 bg-purple-500/10" },
  resolved: { label: "Resolved", className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
  closed: { label: "Closed", className: "border-slate-200 text-slate-400" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "border-slate-200 text-slate-400" },
  medium: { label: "Medium", className: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  high: { label: "High", className: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
  urgent: { label: "Urgent", className: "border-red-500/30 text-red-400 bg-red-500/10" },
};

const AdminSupport = () => {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyMsg, setReplyMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Disputes state
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [disputeLoading, setDisputeLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<DisputeRow | null>(null);
  const [disputeActionLoading, setDisputeActionLoading] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("support_tickets")
        .select(`
          id,
          userId,
          subject,
          category,
          priority,
          status,
          createdAt,
          updatedAt
        `)
        .order("createdAt", { ascending: false });

      if (queryError) throw queryError;

      const rows = data || [];

      // Step 2: Resolve user names and emails from users table
      const userIds = [...new Set(rows.map((t) => t.userId).filter(Boolean))];
      const userInfo: Record<string, { name: string; email: string }> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, firstName, lastName, email")
          .in("id", userIds);
        (users ?? []).forEach((u: { id: string; firstName?: string; lastName?: string; email?: string }) => {
          const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
          userInfo[u.id] = { name: name || "User", email: u.email ?? "—" };
        });
      }

      const mapped: Ticket[] = rows.map((t) => ({
        id: t.id,
        subject: t.subject || "—",
        userName: userInfo[t.userId]?.name ?? (t.userId ? t.userId.slice(0, 8).toUpperCase() : "—"),
        userEmail: userInfo[t.userId]?.email ?? "—",
        category: t.category || "—",
        priority: t.priority ?? "medium",
        status: t.status ?? "open",
        createdAt: t.createdAt
          ? new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          : "—",
        updatedAt: t.updatedAt
          ? new Date(t.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          : "—",
      }));

      setTickets(mapped);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const updateStatus = async (id: string, newStatus: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: newStatus, updatedAt: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
      if (selected?.id === id) setSelected((s) => s ? { ...s, status: newStatus } : s);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update ticket status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplySending(true);
    setReplyMsg(null);
    try {
      const { error: insertError } = await supabase
        .from("support_ticket_messages")
        .insert({
          ticketId: selected.id,
          senderId: user?.id ?? null,
          senderName: "Admin",
          isStaff: true,
          message: replyText.trim(),
        });
      if (insertError) throw insertError;
      // Move ticket to in_progress if it was open
      if (selected.status === "open") {
        await updateStatus(selected.id, "in_progress");
      }
      setReplyText("");
      setReplyMsg({ text: "Reply sent.", ok: true });
    } catch (err: unknown) {
      setReplyMsg({ text: (err as Error).message || "Failed to send reply.", ok: false });
    } finally {
      setReplySending(false);
    }
  };

  const filtered = tickets.filter(
    (t) =>
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.userName.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((t) => t.status === status);
  const openTickets = filtered.filter((t) => ["open", "in_progress", "waiting_customer"].includes(t.status));
  const urgentOpen = tickets.filter((t) => t.priority === "urgent" && ["open", "in_progress"].includes(t.status));

  // ── Disputes ────────────────────────────────────────────────────────────────
  const fetchDisputes = useCallback(async () => {
    setDisputeLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from("disputes")
        .select("id, orderId, buyerId, subject, protectionReason, description, status, createdAt")
        .order("createdAt", { ascending: false });
      if (queryError) throw queryError;

      const rows = data || [];
      const buyerIds = [...new Set(rows.map((r: { buyerId: string }) => r.buyerId).filter(Boolean))];
      const buyerInfo: Record<string, string> = {};
      if (buyerIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, firstName, lastName")
          .in("id", buyerIds);
        (users ?? []).forEach((u: { id: string; firstName?: string; lastName?: string }) => {
          buyerInfo[u.id] = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || "Buyer";
        });
      }

      setDisputes(rows.map((r: { id: string; orderId: string; buyerId: string; subject: string; protectionReason: string; description: string; status: string; createdAt: string }) => ({
        id: r.id,
        orderId: r.orderId ?? "—",
        buyerName: buyerInfo[r.buyerId] ?? r.buyerId?.slice(0, 8).toUpperCase() ?? "—",
        subject: r.subject ?? "—",
        protectionReason: r.protectionReason ?? "—",
        description: r.description ?? "—",
        status: r.status ?? "open",
        createdAt: r.createdAt
          ? new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          : "—",
      })));
    } catch (err: unknown) {
      toast({ title: "Failed to load disputes", description: (err as Error).message, variant: "destructive" });
    } finally {
      setDisputeLoading(false);
    }
  }, []);

  const updateDisputeStatus = async (id: string, newStatus: string) => {
    setDisputeActionLoading(id);
    try {
      const { error } = await supabase
        .from("disputes")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      setDisputes((prev) => prev.map((d) => d.id === id ? { ...d, status: newStatus } : d));
      if (selectedDispute?.id === id) setSelectedDispute((d) => d ? { ...d, status: newStatus } : d);
    } catch (err: unknown) {
      toast({ title: "Failed to update dispute", description: (err as Error).message, variant: "destructive" });
    } finally {
      setDisputeActionLoading(null);
    }
  };

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);
  // ────────────────────────────────────────────────────────────────────────────

  const renderTable = (data: Ticket[]) => (
    <Table>
      <TableHeader>
        <TableRow style={{ borderBottom: "1px solid rgba(148,163,184,0.3)" }}>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Ticket</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>User</TableHead>
          <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Category</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Priority</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Status</TableHead>
          <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Updated</TableHead>
          <TableHead className="text-right text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: "rgba(100,116,139,0.65)" }} />
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8" style={{ color: "rgba(100,116,139,0.65)" }}>
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />No tickets found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((t) => {
            const priCfg = priorityConfig[t.priority] ?? { label: t.priority, className: "border-slate-200 text-slate-400" };
            const stCfg = statusConfig[t.status] ?? { label: t.status, className: "border-slate-200 text-slate-400" };
            return (
              <TableRow key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <TableCell>
                  <p className="text-sm font-medium text-slate-900">{t.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs max-w-[200px] truncate" style={{ color: "rgba(71,85,105,0.85)" }}>{t.subject}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-slate-900">{t.userName}</p>
                  <p className="text-xs" style={{ color: "rgba(71,85,105,0.85)" }}>{t.userEmail}</p>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs" style={{ color: "rgba(71,85,105,0.85)" }}>{t.category}</TableCell>
                <TableCell><Badge variant="outline" className={priCfg.className}>{priCfg.label}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={stCfg.className}>{stCfg.label}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell text-xs" style={{ color: "rgba(71,85,105,0.85)" }}>{t.updatedAt}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-400 hover:text-slate-900 hover:bg-white/10"
                    onClick={() => setSelected(t)}
                  >
                    View
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
    <div className="p-4 sm:p-6 space-y-6" style={{ background: "#f8fafc", minHeight: "100%" }}>
      <div className="pb-2" style={{ borderBottom: "1px solid rgba(148,163,184,0.3)" }}>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Tickets</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(71,85,105,0.85)" }}>
          {tickets.length} total · {openTickets.length} open
        </p>
      </div>

      {error && (
        <div className="rounded-xl border p-4 text-sm" style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Open", count: byStatus("open").length, icon: AlertCircle, color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
          { label: "In Progress", count: byStatus("in_progress").length, icon: Clock, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
          { label: "Resolved", count: byStatus("resolved").length, icon: CheckCircle2, color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
          { label: "Urgent", count: urgentOpen.length, icon: AlertCircle, color: "#F87171", bg: "rgba(248,113,113,0.12)" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-5"
            style={{ background: "#ffffff", border: "1px solid rgba(148,163,184,0.35)", boxShadow: "0 4px 24px rgba(15,23,42,0.08)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: stat.bg }}>
              <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
            </div>
            <div className="text-3xl font-bold text-slate-900">{stat.count}</div>
            <p className="text-xs mt-1.5 font-medium" style={{ color: "rgba(71,85,105,0.85)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(100,116,139,0.65)" }} />
          <Input
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
            style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </div>
      </div>

      <Tabs defaultValue="open">
        <TabsList style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <TabsTrigger value="open" className="data-[state=active]:text-slate-900 data-[state=active]:bg-white/10 text-slate-500">
            Open <Badge variant="outline" className="ml-2 text-xs border-white/20 text-slate-500">{openTickets.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved" className="data-[state=active]:text-slate-900 data-[state=active]:bg-white/10 text-slate-500">Resolved</TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:text-slate-900 data-[state=active]:bg-white/10 text-slate-500">All Tickets</TabsTrigger>
          <TabsTrigger value="disputes" className="data-[state=active]:text-slate-900 data-[state=active]:bg-white/10 text-slate-500">
            Disputes
            {disputes.filter((d) => d.status === "open").length > 0 && (
              <Badge variant="outline" className="ml-2 text-xs border-red-500/30 text-red-400 bg-red-500/10">
                {disputes.filter((d) => d.status === "open").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        {(["open", "resolved", "all"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid rgba(148,163,184,0.35)", boxShadow: "0 4px 24px rgba(15,23,42,0.08)" }}>
              <div className="px-2 py-2">
                {renderTable(
                  tab === "open" ? openTickets :
                  tab === "resolved" ? filtered.filter((t) => ["resolved", "closed"].includes(t.status)) :
                  filtered
                )}
              </div>
            </div>
          </TabsContent>
        ))}
        <TabsContent value="disputes">
          <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid rgba(148,163,184,0.35)", boxShadow: "0 4px 24px rgba(15,23,42,0.08)" }}>
            <Table>
              <TableHeader>
                <TableRow style={{ borderBottom: "1px solid rgba(148,163,184,0.3)" }}>
                  <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>ID</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Buyer</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Subject</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Reason</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Status</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Date</TableHead>
                  <TableHead className="text-right text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputeLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: "rgba(100,116,139,0.65)" }} />
                    </TableCell>
                  </TableRow>
                ) : disputes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8" style={{ color: "rgba(100,116,139,0.65)" }}>
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />No disputes found.
                    </TableCell>
                  </TableRow>
                ) : (
                  disputes.map((d) => {
                    const stCfg = disputeStatusConfig[d.status] ?? { label: d.status, className: "border-slate-200 text-slate-400" };
                    return (
                      <TableRow key={d.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <TableCell>
                          <p className="text-sm font-medium text-slate-900">{d.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs" style={{ color: "rgba(71,85,105,0.8)" }}>Order: {d.orderId.slice(0, 8).toUpperCase()}</p>
                        </TableCell>
                        <TableCell className="text-sm text-slate-900">{d.buyerName}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs max-w-[200px] truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{d.subject}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs" style={{ color: "rgba(71,85,105,0.85)" }}>{d.protectionReason.replace(/_/g, " ")}</TableCell>
                        <TableCell><Badge variant="outline" className={stCfg.className}>{stCfg.label}</Badge></TableCell>
                        <TableCell className="text-xs" style={{ color: "rgba(71,85,105,0.85)" }}>{d.createdAt}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-slate-400 hover:text-slate-900 hover:bg-white/10"
                            onClick={() => setSelectedDispute(d)}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setReplyText(""); setReplyMsg(null); } }}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.id.slice(0, 8).toUpperCase()} — {selected.subject}</DialogTitle>
              <DialogDescription>{selected.userName} · {selected.category}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span style={{ color: "rgba(71,85,105,0.8)" }}>User</span><p className="font-medium text-slate-900">{selected.userName}</p></div>
                <div><span style={{ color: "rgba(71,85,105,0.8)" }}>Email</span><p className="font-medium text-slate-900">{selected.userEmail}</p></div>
                <div><span style={{ color: "rgba(71,85,105,0.8)" }}>Priority</span>
                  <p><Badge variant="outline" className={(priorityConfig[selected.priority] ?? { className: "border-slate-200 text-slate-400" }).className}>
                    {(priorityConfig[selected.priority] ?? { label: selected.priority }).label}
                  </Badge></p>
                </div>
                <div><span style={{ color: "rgba(71,85,105,0.8)" }}>Status</span>
                  <p><Badge variant="outline" className={(statusConfig[selected.status] ?? { className: "border-slate-200 text-slate-400" }).className}>
                    {(statusConfig[selected.status] ?? { label: selected.status }).label}
                  </Badge></p>
                </div>
                <div><span style={{ color: "rgba(71,85,105,0.8)" }}>Created</span><p className="font-medium text-slate-900">{selected.createdAt}</p></div>
                <div><span style={{ color: "rgba(71,85,105,0.8)" }}>Updated</span><p className="font-medium text-slate-900">{selected.updatedAt}</p></div>
              </div>

              {["open", "in_progress", "waiting_customer"].includes(selected.status) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold" style={{ color: "rgba(71,85,105,0.8)" }}>UPDATE STATUS</p>
                  <div className="flex items-center gap-2">
                    <Select
                      defaultValue={selected.status}
                      onValueChange={(val) => updateStatus(selected.id, val)}
                      disabled={actionLoading === selected.id}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="waiting_customer">Waiting Customer</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    {actionLoading === selected.id && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "rgba(100,116,139,0.65)" }} />}
                  </div>
                </div>
              )}

              {/* Admin reply */}
              <div className="space-y-2 pt-2" style={{ borderTop: "1px solid rgba(148,163,184,0.3)" }}>
                <p className="text-xs font-semibold" style={{ color: "rgba(71,85,105,0.8)" }}>SEND REPLY</p>
                <Textarea
                  placeholder="Type your reply..."
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={replySending}
                  className="resize-none text-sm"
                />
                {replyMsg && (
                  <p className={`text-xs ${replyMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{replyMsg.text}</p>
                )}
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              {["open", "in_progress", "waiting_customer"].includes(selected.status) && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => updateStatus(selected.id, "closed")}
                    disabled={actionLoading === selected.id}
                  >
                    Close Ticket
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateStatus(selected.id, "resolved")}
                    disabled={actionLoading === selected.id}
                  >
                    {actionLoading === selected.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Mark Resolved
                  </Button>
                </>
              )}
              <Button
                onClick={handleReply}
                disabled={replySending || !replyText.trim()}
              >
                {replySending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                Send Reply
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Dispute Detail Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={(open) => { if (!open) setSelectedDispute(null); }}>
        {selectedDispute && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Dispute — {selectedDispute.id.slice(0, 8).toUpperCase()}</DialogTitle>
              <DialogDescription>{selectedDispute.buyerName} · {selectedDispute.createdAt}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span style={{ color: "rgba(71,85,105,0.8)" }}>Buyer</span><p className="font-medium text-slate-900">{selectedDispute.buyerName}</p></div>
                <div><span style={{ color: "rgba(71,85,105,0.8)" }}>Order</span><p className="font-medium text-slate-900">{selectedDispute.orderId.slice(0, 8).toUpperCase()}</p></div>
                <div><span style={{ color: "rgba(71,85,105,0.8)" }}>Reason</span><p className="font-medium text-slate-900">{selectedDispute.protectionReason.replace(/_/g, " ")}</p></div>
                <div><span style={{ color: "rgba(71,85,105,0.8)" }}>Status</span>
                  <p><Badge variant="outline" className={(disputeStatusConfig[selectedDispute.status] ?? { className: "border-slate-200 text-slate-400" }).className}>
                    {(disputeStatusConfig[selectedDispute.status] ?? { label: selectedDispute.status }).label}
                  </Badge></p>
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "#ffffff", border: "1px solid rgba(148,163,184,0.35)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "rgba(71,85,105,0.8)" }}>SUBJECT</p>
                <p className="text-sm font-medium text-slate-900 mb-3">{selectedDispute.subject}</p>
                <p className="text-xs font-semibold mb-1" style={{ color: "rgba(71,85,105,0.8)" }}>DESCRIPTION</p>
                <p className="text-sm text-slate-900">{selectedDispute.description}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: "rgba(71,85,105,0.8)" }}>UPDATE STATUS</p>
                <Select
                  value={selectedDispute.status}
                  onValueChange={(val) => updateDisputeStatus(selectedDispute.id, val)}
                  disabled={disputeActionLoading === selectedDispute.id}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              {disputeActionLoading === selectedDispute.id && (
                <Loader2 className="h-4 w-4 animate-spin mr-1" style={{ color: "rgba(71,85,105,0.8)" }} />
              )}
              <Button
                variant="outline"
                onClick={() => updateDisputeStatus(selectedDispute.id, "under_review")}
                disabled={disputeActionLoading === selectedDispute.id || selectedDispute.status === "under_review"}
              >
                Mark Under Review
              </Button>
              <Button
                onClick={() => updateDisputeStatus(selectedDispute.id, "resolved")}
                disabled={disputeActionLoading === selectedDispute.id || selectedDispute.status === "resolved"}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Resolve
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminSupport;
