import { useState, useEffect, useCallback } from "react";
import { Flag, Search, Eye, CheckCircle2, Ban, AlertTriangle, MoreHorizontal, Loader2, ShieldOff } from "lucide-react";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface FlaggedItem {
  id: string;
  productId: string;
  productTitle: string;
  reportedBy: string;
  reason: string;
  description: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  date: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "border-primary/40 text-primary bg-primary/10" },
  reviewed: { label: "Reviewed", className: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  resolved: { label: "Resolved", className: "border-emerald-500/30 text-success bg-success/10" },
  dismissed: { label: "Dismissed", className: "border-slate-200 text-slate-400" },
};

const AdminFlagged = () => {
  const [items, setItems] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selected, setSelected] = useState<FlaggedItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("reported_listings")
        .select(`
          id,
          productId,
          reportedBy,
          reason,
          description,
          status,
          createdAt,
          product:products(title)
        `)
        .order("createdAt", { ascending: false });

      if (queryError) throw queryError;

      const mapped: FlaggedItem[] = (data || []).map((r) => {
        const productObj = Array.isArray(r.product) ? r.product[0] : r.product;
        return {
          id: r.id,
          productId: r.productId,
          productTitle: productObj?.title || "Unknown product",
          reportedBy: r.reportedBy ? r.reportedBy.slice(0, 8).toUpperCase() : "—",
          reason: r.reason || "—",
          description: r.description || "—",
          status: r.status ?? "pending",
          date: r.createdAt
            ? new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : "—",
        };
      });

      setItems(mapped);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load flagged items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const updateStatus = async (id: string, newStatus: FlaggedItem["status"]) => {
    setActionLoading(id);
    setError(null);
    try {
      const { error } = await supabase
        .from("reported_listings")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: newStatus } : i));
      if (selected?.id === id) setSelected((s) => s ? { ...s, status: newStatus } : s);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const deactivateProduct = async (item: FlaggedItem) => {
    setActionLoading(item.id);
    setError(null);
    try {
      const { error: productError } = await supabase
        .from("products")
        .update({ isActive: false })
        .eq("id", item.productId);
      if (productError) throw productError;
      // Also resolve the report
      await supabase
        .from("reported_listings")
        .update({ status: "resolved" })
        .eq("id", item.id);
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "resolved" } : i));
      if (selected?.id === item.id) setSelected((s) => s ? { ...s, status: "resolved" } : s);
      toast({ title: "Product deactivated", description: `"${item.productTitle}" has been deactivated and the report resolved.` });
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to deactivate product");
      toast({ title: "Error", description: "Failed to deactivate product.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = items.filter(
    (f) =>
      f.productTitle.toLowerCase().includes(search.toLowerCase()) ||
      f.reason.toLowerCase().includes(search.toLowerCase()) ||
      f.reportedBy.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((f) => f.status === status);
  const pendingCount = items.filter((f) => f.status === "pending").length;

  const renderTable = (data: FlaggedItem[]) => (
    <Table>
      <TableHeader>
        <TableRow style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Product</TableHead>
          <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Reported By</TableHead>
          <TableHead className="hidden md:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Reason</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Status</TableHead>
          <TableHead className="text-right text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: "rgba(100,116,139,0.65)" }} />
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8" style={{ color: "rgba(100,116,139,0.65)" }}>
              <Flag className="h-8 w-8 mx-auto mb-2 opacity-40" />No flagged items.
            </TableCell>
          </TableRow>
        ) : (
          data.map((f) => (
            <TableRow key={f.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <TableCell>
                <p className="text-sm font-medium text-white">{f.productTitle}</p>
                <p className="text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>{f.date}</p>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>{f.reportedBy}</TableCell>
              <TableCell className="hidden md:table-cell text-xs max-w-[150px] truncate" style={{ color: "rgba(148,163,184,0.85)" }}>{f.reason}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusConfig[f.status]?.className ?? "border-slate-200 text-slate-400"}>
                  {statusConfig[f.status]?.label ?? f.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" disabled={actionLoading === f.id}>
                      {actionLoading === f.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelected(f)}>
                      <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                    </DropdownMenuItem>
                    {f.status === "pending" && (
                      <DropdownMenuItem onClick={() => updateStatus(f.id, "reviewed")}>
                        <AlertTriangle className="h-3.5 w-3.5 mr-2" /> Mark Reviewed
                      </DropdownMenuItem>
                    )}
                    {f.status !== "resolved" && (
                      <DropdownMenuItem onClick={() => updateStatus(f.id, "resolved")}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Resolve
                      </DropdownMenuItem>
                    )}
                    {f.status !== "dismissed" && (
                      <DropdownMenuItem className="text-destructive" onClick={() => updateStatus(f.id, "dismissed")}>
                        <Ban className="h-3.5 w-3.5 mr-2" /> Dismiss
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-danger focus:text-danger"
                      onClick={() => deactivateProduct(f)}
                    >
                      <ShieldOff className="h-3.5 w-3.5 mr-2" /> Deactivate Product
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6" style={{ background: "transparent", minHeight: "100%" }}>
      <div className="pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <h1 className="text-2xl font-bold text-white tracking-tight">Flagged Content</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.85)" }}>
          {items.length} reports · {pendingCount} pending review
        </p>
      </div>

      {error && (
        <div className="rounded-xl border p-4 text-sm" style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending", count: byStatus("pending").length, icon: AlertTriangle, color: "#F59E0B", bg: "rgba(245,158,11,0.12)", tab: "pending" },
          { label: "Reviewed", count: byStatus("reviewed").length, icon: Flag, color: "#60A5FA", bg: "rgba(96,165,250,0.12)", tab: "reviewed" },
          { label: "Resolved", count: byStatus("resolved").length, icon: CheckCircle2, color: "rgba(212,175,55,1)", bg: "rgba(212,175,55,0.12)", tab: "resolved" },
          { label: "Dismissed", count: byStatus("dismissed").length, icon: Ban, color: "rgba(148,163,184,0.85)", bg: "rgba(148,163,184,0.3)", tab: "dismissed" },
        ].map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => setActiveTab(stat.tab)}
            className="rounded-2xl p-5 text-left transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{
              
              border: activeTab === stat.tab ? `2px solid ${stat.color}` : "1px solid rgba(255,255,255,0.05)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: stat.bg }}>
              <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
            </div>
            <div className="text-3xl font-bold text-white">{stat.count}</div>
            <p className="text-xs mt-1.5 font-medium" style={{ color: "rgba(148,163,184,0.85)" }}>{stat.label}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(100,116,139,0.65)" }} />
          <Input
            placeholder="Search flagged items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
            style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <TabsTrigger value="pending" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">
            Pending <Badge variant="outline" className="ml-2 text-xs border-white/20 text-slate-500">{byStatus("pending").length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="reviewed" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">Reviewed</TabsTrigger>
          <TabsTrigger value="resolved" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">Resolved</TabsTrigger>
          <TabsTrigger value="dismissed" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">Dismissed</TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">All</TabsTrigger>
        </TabsList>
        {(["pending", "reviewed", "resolved", "dismissed", "all"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>
              <div className="px-2 py-2 overflow-x-auto">
                {renderTable(tab === "all" ? filtered : byStatus(tab))}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.productTitle}</DialogTitle>
              <DialogDescription>Flagged product report</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span style={{ color: "rgba(148,163,184,0.85)" }}>Reported By</span><p className="font-medium text-white">{selected.reportedBy}</p></div>
                <div><span style={{ color: "rgba(148,163,184,0.85)" }}>Reason</span><p className="font-medium text-white">{selected.reason}</p></div>
                <div><span style={{ color: "rgba(148,163,184,0.85)" }}>Date</span><p className="font-medium text-white">{selected.date}</p></div>
                <div><span style={{ color: "rgba(148,163,184,0.85)" }}>Status</span>
                  <p><Badge variant="outline" className={statusConfig[selected.status]?.className ?? "border-slate-200 text-slate-400"}>
                    {statusConfig[selected.status]?.label ?? selected.status}
                  </Badge></p>
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "rgba(148,163,184,0.85)" }}>DETAILS</p>
                <p className="text-sm text-white">{selected.description}</p>
              </div>
              {selected.productId && (
                <a
                  href={`/product/${selected.productId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  <Eye className="h-3.5 w-3.5" /> View product listing (new tab)
                </a>
              )}
            </div>
            {selected.status === "pending" && (
              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => updateStatus(selected.id, "dismissed")}
                  disabled={actionLoading === selected.id}
                >
                  {actionLoading === selected.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Ban className="h-4 w-4 mr-1" />}
                  Dismiss
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deactivateProduct(selected)}
                  disabled={actionLoading === selected.id}
                >
                  {actionLoading === selected.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldOff className="h-4 w-4 mr-1" />}
                  Deactivate Product
                </Button>
                <Button
                  onClick={() => updateStatus(selected.id, "resolved")}
                  disabled={actionLoading === selected.id}
                >
                  {actionLoading === selected.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Resolve (No Action)
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminFlagged;
