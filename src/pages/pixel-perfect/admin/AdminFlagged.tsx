import { useState, useEffect, useCallback } from "react";
import { Flag, Search, Filter, Eye, CheckCircle2, Ban, AlertTriangle, MoreHorizontal, Loader2 } from "lucide-react";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";

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
  pending: { label: "Pending", className: "bg-amber-500/15 text-amber-700 border-amber-200" },
  reviewed: { label: "Reviewed", className: "bg-blue-500/15 text-blue-700 border-blue-200" },
  resolved: { label: "Resolved", className: "bg-emerald-500/15 text-emerald-700 border-emerald-200" },
  dismissed: { label: "Dismissed", className: "bg-muted text-muted-foreground" },
};

const AdminFlagged = () => {
  const [items, setItems] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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
          reason,
          description,
          status,
          createdAt,
          product:products(title),
          reporter:users!reported_listings_reportedBy_fkey(firstName, lastName, email)
        `)
        .order("createdAt", { ascending: false });

      if (queryError) throw queryError;

      const mapped: FlaggedItem[] = (data || []).map((r: any) => {
        const productObj = Array.isArray(r.product) ? r.product[0] : r.product;
        const reporterObj = Array.isArray(r.reporter) ? r.reporter[0] : r.reporter;
        const reporterName = reporterObj
          ? `${reporterObj.firstName ?? ""} ${reporterObj.lastName ?? ""}`.trim() || reporterObj.email || "—"
          : "—";
        return {
          id: r.id,
          productId: r.productId,
          productTitle: productObj?.title || "Unknown product",
          reportedBy: reporterName,
          reason: r.reason || "—",
          description: r.description || "—",
          status: r.status ?? "pending",
          date: r.createdAt
            ? new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : "—",
        };
      });

      setItems(mapped);
    } catch (err: any) {
      setError(err.message || "Failed to load flagged items");
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
    } catch (err: any) {
      setError(err.message || "Failed to update status");
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
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead className="hidden sm:table-cell">Reported By</TableHead>
          <TableHead className="hidden md:table-cell">Reason</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              <Flag className="h-8 w-8 mx-auto mb-2 opacity-40" />No flagged items.
            </TableCell>
          </TableRow>
        ) : (
          data.map((f) => (
            <TableRow key={f.id}>
              <TableCell>
                <p className="text-sm font-medium text-foreground">{f.productTitle}</p>
                <p className="text-xs text-muted-foreground">{f.date}</p>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{f.reportedBy}</TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[150px] truncate">{f.reason}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusConfig[f.status]?.className ?? "bg-muted text-muted-foreground"}>
                  {statusConfig[f.status]?.label ?? f.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading === f.id}>
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Flagged Content</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {items.length} reports · {pendingCount} pending review
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending", count: byStatus("pending").length, icon: AlertTriangle, color: "text-amber-600 bg-amber-500/10" },
          { label: "Reviewed", count: byStatus("reviewed").length, icon: Flag, color: "text-blue-600 bg-blue-500/10" },
          { label: "Resolved", count: byStatus("resolved").length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
          { label: "Dismissed", count: byStatus("dismissed").length, icon: Ban, color: "text-muted-foreground bg-muted" },
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
          <Input placeholder="Search flagged items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Button variant="outline" size="default"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending <Badge variant="secondary" className="ml-2 text-xs">{byStatus("pending").length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="pending"><Card><CardContent className="pt-4">{renderTable(byStatus("pending"))}</CardContent></Card></TabsContent>
        <TabsContent value="resolved"><Card><CardContent className="pt-4">{renderTable(byStatus("resolved"))}</CardContent></Card></TabsContent>
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
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
                <div><span className="text-muted-foreground">Reported By</span><p className="font-medium text-foreground">{selected.reportedBy}</p></div>
                <div><span className="text-muted-foreground">Reason</span><p className="font-medium text-foreground">{selected.reason}</p></div>
                <div><span className="text-muted-foreground">Date</span><p className="font-medium text-foreground">{selected.date}</p></div>
                <div><span className="text-muted-foreground">Status</span>
                  <p><Badge variant="outline" className={statusConfig[selected.status]?.className ?? "bg-muted text-muted-foreground"}>
                    {statusConfig[selected.status]?.label ?? selected.status}
                  </Badge></p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">DETAILS</p>
                <p className="text-sm text-foreground">{selected.description}</p>
              </div>
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
                  onClick={() => updateStatus(selected.id, "resolved")}
                  disabled={actionLoading === selected.id}
                >
                  {actionLoading === selected.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Resolve
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
