import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Search, Filter, Clock, CheckCircle2, AlertCircle, User, Loader2 } from "lucide-react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

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

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-500/15 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", className: "bg-amber-500/15 text-amber-700 border-amber-200" },
  waiting_customer: { label: "Waiting", className: "bg-purple-500/15 text-purple-700 border-purple-200" },
  resolved: { label: "Resolved", className: "bg-emerald-500/15 text-emerald-700 border-emerald-200" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", className: "bg-blue-500/10 text-blue-700" },
  high: { label: "High", className: "bg-amber-500/10 text-amber-700" },
  urgent: { label: "Urgent", className: "bg-red-500/10 text-red-700" },
};

const AdminSupport = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("support_tickets")
        .select(`
          id,
          subject,
          category,
          priority,
          status,
          createdAt,
          updatedAt,
          user:users!support_tickets_userId_fkey(firstName, lastName, email)
        `)
        .order("createdAt", { ascending: false });

      if (queryError) throw queryError;

      const mapped: Ticket[] = (data || []).map((t: any) => {
        const userObj = Array.isArray(t.user) ? t.user[0] : t.user;
        const userName = userObj
          ? `${userObj.firstName ?? ""} ${userObj.lastName ?? ""}`.trim() || userObj.email || "—"
          : "—";
        return {
          id: t.id,
          subject: t.subject || "—",
          userName,
          userEmail: userObj?.email || "—",
          category: t.category || "—",
          priority: t.priority ?? "medium",
          status: t.status ?? "open",
          createdAt: t.createdAt
            ? new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : "—",
          updatedAt: t.updatedAt
            ? new Date(t.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : "—",
        };
      });

      setTickets(mapped);
    } catch (err: any) {
      setError(err.message || "Failed to load support tickets");
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
    } catch (err: any) {
      setError(err.message || "Failed to update ticket status");
    } finally {
      setActionLoading(null);
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

  const renderTable = (data: Ticket[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ticket</TableHead>
          <TableHead>User</TableHead>
          <TableHead className="hidden sm:table-cell">Category</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Updated</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />No tickets found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((t) => {
            const priCfg = priorityConfig[t.priority] ?? { label: t.priority, className: "bg-muted text-muted-foreground" };
            const stCfg = statusConfig[t.status] ?? { label: t.status, className: "bg-muted text-muted-foreground" };
            return (
              <TableRow key={t.id}>
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{t.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground max-w-[200px] truncate">{t.subject}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{t.userName}</p>
                  <p className="text-xs text-muted-foreground">{t.userEmail}</p>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{t.category}</TableCell>
                <TableCell><Badge variant="outline" className={priCfg.className}>{priCfg.label}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={stCfg.className}>{stCfg.label}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{t.updatedAt}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {tickets.length} total · {openTickets.length} open
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Open", count: byStatus("open").length, icon: AlertCircle, color: "text-blue-600 bg-blue-500/10" },
          { label: "In Progress", count: byStatus("in_progress").length, icon: Clock, color: "text-amber-600 bg-amber-500/10" },
          { label: "Resolved", count: byStatus("resolved").length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
          { label: "Urgent", count: urgentOpen.length, icon: AlertCircle, color: "text-red-600 bg-red-500/10" },
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

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Button variant="outline" size="default"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">
            Open <Badge variant="secondary" className="ml-2 text-xs">{openTickets.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="open"><Card><CardContent className="pt-4">{renderTable(openTickets)}</CardContent></Card></TabsContent>
        <TabsContent value="resolved"><Card><CardContent className="pt-4">{renderTable(filtered.filter((t) => ["resolved", "closed"].includes(t.status)))}</CardContent></Card></TabsContent>
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.id.slice(0, 8).toUpperCase()} — {selected.subject}</DialogTitle>
              <DialogDescription>{selected.userName} · {selected.category}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">User</span><p className="font-medium text-foreground">{selected.userName}</p></div>
                <div><span className="text-muted-foreground">Email</span><p className="font-medium text-foreground">{selected.userEmail}</p></div>
                <div><span className="text-muted-foreground">Priority</span>
                  <p><Badge variant="outline" className={(priorityConfig[selected.priority] ?? { className: "bg-muted text-muted-foreground" }).className}>
                    {(priorityConfig[selected.priority] ?? { label: selected.priority }).label}
                  </Badge></p>
                </div>
                <div><span className="text-muted-foreground">Status</span>
                  <p><Badge variant="outline" className={(statusConfig[selected.status] ?? { className: "bg-muted text-muted-foreground" }).className}>
                    {(statusConfig[selected.status] ?? { label: selected.status }).label}
                  </Badge></p>
                </div>
                <div><span className="text-muted-foreground">Created</span><p className="font-medium text-foreground">{selected.createdAt}</p></div>
                <div><span className="text-muted-foreground">Updated</span><p className="font-medium text-foreground">{selected.updatedAt}</p></div>
              </div>

              {["open", "in_progress", "waiting_customer"].includes(selected.status) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">UPDATE STATUS</p>
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
                    {actionLoading === selected.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                </div>
              )}
            </div>
            {["open", "in_progress", "waiting_customer"].includes(selected.status) && (
              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => updateStatus(selected.id, "closed")}
                  disabled={actionLoading === selected.id}
                >
                  Close Ticket
                </Button>
                <Button
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
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminSupport;
