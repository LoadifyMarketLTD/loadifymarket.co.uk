import { useState, useEffect, useCallback } from "react";
import { ShoppingCart, Search, Eye, Loader2 } from "lucide-react";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface Order {
  id: string;
  orderNumber: string;
  buyer: string;
  product: string;
  total: number;
  status: string;
  date: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  packed: { label: "Packed", className: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
  shipped: { label: "Shipped", className: "border-purple-500/30 text-purple-400 bg-purple-500/10" },
  delivered: { label: "Delivered", className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
  cancelled: { label: "Cancelled", className: "border-white/10 text-slate-400" },
  refunded: { label: "Refunded", className: "border-white/10 text-slate-400" },
  disputed: { label: "Disputed", className: "border-red-500/30 text-red-400 bg-red-500/10" },
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const updateOrderStatus = async (id: string, newStatus: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", id);
      if (updateError) throw updateError;
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: newStatus } : o));
      setSelected((s) => s && s.id === id ? { ...s, status: newStatus } : s);
      toast({ title: "Order status updated" });
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update order status");
    } finally {
      setActionLoading(null);
    }
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Fetch orders with product title only (no user embed)
      const { data, error: queryError } = await supabase
        .from("orders")
        .select(`
          id,
          orderNumber,
          total,
          status,
          createdAt,
          buyerId,
          product:products(title)
        `)
        .order("createdAt", { ascending: false })
        .limit(100);

      if (queryError) throw queryError;

      const rows = data || [];

      // Step 2: Resolve buyer names from users table
      const buyerIds = [...new Set(rows.map((o) => o.buyerId).filter(Boolean))];
      const buyerNames: Record<string, string> = {};
      if (buyerIds.length > 0) {
        const { data: buyers } = await supabase
          .from("users")
          .select("id, firstName, lastName")
          .in("id", buyerIds);
        (buyers ?? []).forEach((b: { id: string; firstName?: string; lastName?: string }) => {
          const name = [b.firstName, b.lastName].filter(Boolean).join(" ").trim();
          buyerNames[b.id] = name || "Customer";
        });
      }

      const mapped: Order[] = rows.map((o) => {
        const productObj = Array.isArray(o.product) ? o.product[0] : o.product;
        return {
          id: o.id,
          orderNumber: o.orderNumber || o.id.slice(0, 8).toUpperCase(),
          buyer: buyerNames[o.buyerId] ?? (o.buyerId ? o.buyerId.slice(0, 8).toUpperCase() : "—"),
          product: productObj?.title || "—",
          total: o.total ?? 0,
          status: o.status ?? "paid",
          date: o.createdAt
            ? new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : "—",
        };
      });

      setOrders(mapped);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.buyer.toLowerCase().includes(search.toLowerCase()) ||
      o.product.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((o) => o.status === status);
  const activeOrders = filtered.filter((o) => !["cancelled", "refunded"].includes(o.status));
  const totalValue = orders.reduce((s, o) => s + (o.total || 0), 0);

  const renderTable = (data: Order[]) => (
    <Table>
      <TableHeader>
        <TableRow style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Order</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Buyer</TableHead>
          <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Product</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Total</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Status</TableHead>
          <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Date</TableHead>
          <TableHead className="text-right text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: "rgba(255,255,255,0.3)" }} />
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8" style={{ color: "rgba(255,255,255,0.3)" }}>
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />No orders found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((o) => {
            const cfg = statusConfig[o.status] ?? { label: o.status, className: "border-white/10 text-slate-400" };
            return (
              <TableRow key={o.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <TableCell className="font-medium text-sm text-white">{o.orderNumber}</TableCell>
                <TableCell className="text-sm text-white">{o.buyer}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs max-w-[180px] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{o.product}</TableCell>
                <TableCell className="text-sm font-semibold text-white">£{o.total.toLocaleString()}</TableCell>
                <TableCell><Badge variant="outline" className={cfg.className}>{cfg.label}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{o.date}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => setSelected(o)}>
                    <Eye className="h-4 w-4" />
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
    <div className="p-4 sm:p-6 space-y-6" style={{ background: "#0A0B1A", minHeight: "100%" }}>
      <div className="pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h1 className="text-2xl font-bold text-white tracking-tight">Order Management</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          {orders.length} total orders · {byStatus("disputed").length} disputed
        </p>
      </div>

      {error && (
        <div className="rounded-xl border p-4 text-sm" style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", count: orders.length, value: `£${totalValue.toLocaleString()}`, color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
          { label: "Active", count: activeOrders.length, value: "In progress", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
          { label: "Delivered", count: byStatus("delivered").length, value: "Completed", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
          { label: "Disputed", count: byStatus("disputed").length, value: "Needs attention", color: "#F87171", bg: "rgba(248,113,113,0.12)" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: stat.bg }}>
              <ShoppingCart className="h-5 w-5" style={{ color: stat.color }} />
            </div>
            <div className="text-3xl font-bold text-white">{stat.count}</div>
            <p className="text-xs mt-1.5 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>{stat.label}</p>
            <p className="text-xs mt-0.5" style={{ color: stat.color, opacity: 0.8 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <TabsTrigger value="all" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-white/50">All <Badge variant="outline" className="ml-2 text-xs border-white/20 text-white/60">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-white/50">Active</TabsTrigger>
          <TabsTrigger value="delivered" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-white/50">Delivered</TabsTrigger>
          <TabsTrigger value="disputed" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-white/50">Disputed</TabsTrigger>
        </TabsList>
        {(["all", "active", "delivered", "disputed"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
              <div className="px-2 py-2">
                {renderTable(
                  tab === "all" ? filtered :
                  tab === "active" ? activeOrders.filter((o) => o.status !== "delivered") :
                  byStatus(tab)
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.orderNumber}</DialogTitle>
              <DialogDescription>Order details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Buyer</span><p className="font-medium text-white">{selected.buyer}</p></div>
                <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Product</span><p className="font-medium text-white">{selected.product}</p></div>
                <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Total</span><p className="font-semibold text-white">£{selected.total.toLocaleString()}</p></div>
                <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Date</span><p className="font-medium text-white">{selected.date}</p></div>
                <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Status</span>
                  <p><Badge variant="outline" className={(statusConfig[selected.status] ?? { className: "border-white/10 text-slate-400" }).className}>
                    {(statusConfig[selected.status] ?? { label: selected.status }).label}
                  </Badge></p>
                </div>
              </div>
              <div className="space-y-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>UPDATE STATUS</p>
                <div className="flex items-center gap-2">
                  <Select
                    value={selected.status}
                    onValueChange={(val) => updateOrderStatus(selected.id, val)}
                    disabled={actionLoading === selected.id}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="packed">Packed</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="disputed">Disputed</SelectItem>
                    </SelectContent>
                  </Select>
                  {actionLoading === selected.id && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminOrders;
