import { useState, useEffect, useCallback } from "react";
import { ShoppingCart, Search, Eye, Loader2, RotateCcw, AlertCircle } from "lucide-react";
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
import { authorizedFetch } from "@/lib/authorizedFetch";
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
  shipped: { label: "Shipped", className: "border-[#0A2239]/30 text-[#0A2239] bg-[#0A2239]/10" },
  delivered: { label: "Delivered", className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
  cancelled: { label: "Cancelled", className: "border-slate-200 text-slate-400" },
  refunded: { label: "Refunded", className: "border-slate-200 text-slate-400" },
  disputed: { label: "Disputed", className: "border-red-500/30 text-red-400 bg-red-500/10" },
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const issueRefund = async (order: Order) => {
    setRefundLoading(true);
    setRefundError(null);
    try {
      const res = await authorizedFetch("/.netlify/functions/create-refund", {
        method: "POST",
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json() as { success?: boolean; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Refund failed");
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "refunded" } : o));
      setSelected((s) => s && s.id === order.id ? { ...s, status: "refunded" } : s);
      toast({ title: "Refund issued", description: data.message });
    } catch (err: unknown) {
      const msg = (err as Error).message;
      setRefundError(msg);
      toast({ title: "Refund failed", description: msg, variant: "destructive" });
    } finally {
      setRefundLoading(false);
    }
  };

  const updateOrderStatus = async (id: string, newStatus: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const res = await authorizedFetch("/.netlify/functions/admin-orders", {
        method: "POST",
        body: JSON.stringify({ op: "update_status", orderId: id, status: newStatus }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to update order status");
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: newStatus } : o));
      setSelected((s) => s && s.id === id ? { ...s, status: newStatus } : s);
      toast({ title: "Order status updated successfully" });
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
      const res = await authorizedFetch("/.netlify/functions/admin-orders", {
        method: "GET",
      });
      const data = await res.json() as { orders?: Order[]; error?: string; detail?: string };
      if (!res.ok) {
        const msg = [data.error, data.detail].filter(Boolean).join(" — ") || "Failed to load orders";
        throw new Error(msg);
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err: unknown) {
      const msg = (err as Error).message || "Unable to load orders. Please try again.";
      console.error("[AdminOrders] fetchOrders failed:", msg);
      setError(msg);
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
  const activeOrders = filtered.filter((o) => ["paid", "packed", "shipped"].includes(o.status));
  const totalValue = orders.reduce((s, o) => s + (o.total || 0), 0);

  const renderTable = (data: Order[]) => (
    <Table>
      <TableHeader>
        <TableRow style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Order</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Buyer</TableHead>
          <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Product</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Total</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Status</TableHead>
          <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Date</TableHead>
          <TableHead className="text-right text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Action</TableHead>
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
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />No orders found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((o) => {
            const cfg = statusConfig[o.status] ?? { label: o.status, className: "border-slate-200 text-slate-400" };
            return (
              <TableRow key={o.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <TableCell className="font-medium text-sm text-white">{o.orderNumber}</TableCell>
                <TableCell className="text-sm text-white">{o.buyer}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs max-w-[180px] truncate" style={{ color: "rgba(148,163,184,0.85)" }}>{o.product}</TableCell>
                <TableCell className="text-sm font-semibold text-white">£{o.total.toLocaleString()}</TableCell>
                <TableCell><Badge variant="outline" className={cfg.className}>{cfg.label}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>{o.date}</TableCell>
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
    <div className="p-4 sm:p-6 space-y-6" style={{ background: "transparent", minHeight: "100%" }}>
      <div className="pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <h1 className="text-2xl font-bold text-white tracking-tight">Order Management</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.85)" }}>
          {orders.length} total orders · {byStatus("disputed").length} disputed
        </p>
      </div>

      {error && (
        <div className="rounded-xl border p-4 flex items-center justify-between gap-4" style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)" }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: "#f87171" }}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchOrders}
            className="shrink-0 text-xs border border-red-500/40 hover:bg-red-500/10"
            style={{ color: "#f87171" }}
          >
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", count: orders.length, value: `£${totalValue.toLocaleString()}`, color: "#FBBF24", bg: "rgba(251,191,36,0.12)", tab: "all" },
          { label: "Active", count: activeOrders.length, value: "In progress", color: "#60A5FA", bg: "rgba(96,165,250,0.12)", tab: "active" },
          { label: "Delivered", count: byStatus("delivered").length, value: "Completed", color: "#0A2239", bg: "rgba(10,34,57,0.08)", tab: "delivered" },
          { label: "Disputed", count: byStatus("disputed").length, value: "Needs attention", color: "#F87171", bg: "rgba(248,113,113,0.12)", tab: "disputed" },
        ].map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => setActiveTab(stat.tab)}
            className="rounded-2xl p-5 text-left transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]"
            style={{
              background: "linear-gradient(145deg, #0B1220, #0F172A)",
              border: activeTab === stat.tab ? `2px solid ${stat.color}` : "1px solid rgba(255,255,255,0.05)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: stat.bg }}>
              <ShoppingCart className="h-5 w-5" style={{ color: stat.color }} />
            </div>
            <div className="text-3xl font-bold text-white">{stat.count}</div>
            <p className="text-xs mt-1.5 font-medium" style={{ color: "rgba(148,163,184,0.85)" }}>{stat.label}</p>
            <p className="text-xs mt-0.5" style={{ color: stat.color, opacity: 0.8 }}>{stat.value}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(100,116,139,0.65)" }} />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
            style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <TabsTrigger value="all" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">All <Badge variant="outline" className="ml-2 text-xs border-white/20 text-slate-500">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">Active</TabsTrigger>
          <TabsTrigger value="delivered" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">Delivered</TabsTrigger>
          <TabsTrigger value="disputed" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">Disputed</TabsTrigger>
        </TabsList>
        {(["all", "active", "delivered", "disputed"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(145deg, #0B1220, #0F172A)", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>
              <div className="px-2 py-2 overflow-x-auto">
                {renderTable(
                  tab === "all" ? filtered :
                  tab === "active" ? activeOrders :
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
                <div><span style={{ color: "rgba(148,163,184,0.85)" }}>Buyer</span><p className="font-medium text-white">{selected.buyer}</p></div>
                <div><span style={{ color: "rgba(148,163,184,0.85)" }}>Product</span><p className="font-medium text-white">{selected.product}</p></div>
                <div><span style={{ color: "rgba(148,163,184,0.85)" }}>Total</span><p className="font-semibold text-white">£{selected.total.toLocaleString()}</p></div>
                <div><span style={{ color: "rgba(148,163,184,0.85)" }}>Date</span><p className="font-medium text-white">{selected.date}</p></div>
                <div><span style={{ color: "rgba(148,163,184,0.85)" }}>Status</span>
                  <p><Badge variant="outline" className={(statusConfig[selected.status] ?? { className: "border-slate-200 text-slate-400" }).className}>
                    {(statusConfig[selected.status] ?? { label: selected.status }).label}
                  </Badge></p>
                </div>
              </div>
              <div className="space-y-2 pt-2" style={{ borderTop: "1px solid rgba(148,163,184,0.3)" }}>
                <p className="text-xs font-semibold" style={{ color: "rgba(148,163,184,0.85)" }}>UPDATE STATUS</p>
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
                  {actionLoading === selected.id && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "rgba(100,116,139,0.65)" }} />}
                </div>
              </div>
              {["paid", "packed", "shipped", "delivered", "disputed"].includes(selected.status) && (
                <div className="space-y-2 pt-2" style={{ borderTop: "1px solid rgba(148,163,184,0.3)" }}>
                  <p className="text-xs font-semibold" style={{ color: "rgba(148,163,184,0.85)" }}>STRIPE REFUND</p>
                  <p className="text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>
                    This will issue a real Stripe refund and mark the order as refunded.
                  </p>
                  {refundError && (
                    <div className="flex items-center gap-2 text-xs text-red-400">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{refundError}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60"
                    disabled={refundLoading}
                    onClick={() => issueRefund(selected)}
                  >
                    {refundLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</>
                    ) : (
                      <><RotateCcw className="h-4 w-4 mr-2" />Issue Stripe Refund</>
                    )}
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelected(null); setRefundError(null); }}>Close</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminOrders;
