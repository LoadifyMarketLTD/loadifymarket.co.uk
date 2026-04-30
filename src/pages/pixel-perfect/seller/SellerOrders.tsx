import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";
import type { User } from "@/types";

type BuyerData = Pick<User, "id" | "firstName" | "lastName">;

interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  total: number;
  status: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  awaiting_payment: "bg-amber-500/20 text-amber-700 ring-1 ring-amber-400/40",
  paid: "bg-blue-500/10 text-blue-700",
  packed: "bg-amber-500/10 text-amber-700",
  shipped: "bg-purple-500/10 text-purple-700",
  delivered: "bg-orange-500/10 text-orange-700",
  completed: "bg-emerald-500/10 text-emerald-700",
  cancelled: "bg-red-500/10 text-red-700",
  refunded: "bg-muted text-muted-foreground",
  invoice_requested: "bg-blue-500/10 text-blue-700",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const SellerOrders = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select(`id, orderNumber, total, status, createdAt, buyerId`)
        .eq("sellerId", user.id)
        .order("createdAt", { ascending: false });
      const rows = (data ?? []) as Array<{
        id: string; orderNumber: string; total: number; status: string; createdAt: string; buyerId: string;
      }>;

      // Resolve buyer names via secondary query
      const buyerIds = [...new Set(rows.map((o) => o.buyerId).filter(Boolean))];
      const buyerNames: Record<string, string> = {};
      if (buyerIds.length > 0) {
        const { data: buyers } = await supabase
          .from("users")
          .select("id, firstName, lastName")
          .in("id", buyerIds);
        (buyers ?? []).forEach((b: BuyerData) => {
          const name = [b.firstName, b.lastName].filter(Boolean).join(" ").trim();
          buyerNames[b.id] = name || "Customer";
        });
      }

      setOrders(
        rows.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          buyerId: o.buyerId,
          buyerName: buyerNames[o.buyerId] ?? "Customer",
          total: o.total,
          status: o.status,
          createdAt: o.createdAt,
        }))
      );
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.buyerName.toLowerCase().includes(search.toLowerCase())
  );

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId)
        .eq("sellerId", user!.id);
      if (error) throw error;

      const order = orders.find((o) => o.id === orderId);

      // Notify the buyer about status changes they care about.
      if (order?.buyerId && (newStatus === "packed" || newStatus === "shipped")) {
        const notifMap: Record<string, { title: string; message: string; link: string }> = {
          packed: {
            title: "Your order is being packed",
            message: `Order ${order.orderNumber} is being packed and will be dispatched soon.`,
            link: "/buyer/orders",
          },
          shipped: {
            title: "Your order is on its way!",
            message: `Order ${order.orderNumber} has been dispatched and is heading to you. Check your orders page to confirm delivery once it arrives.`,
            link: "/buyer/orders",
          },
        };
        const notif = notifMap[newStatus];
        await supabase.from("notifications").insert({
          userId: order.buyerId,
          type: "shipment",
          title: notif.title,
          message: notif.message,
          link: notif.link,
        });
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      toast({ title: "Order updated", description: `Status changed to ${newStatus}.` });
    } catch (err) {
      toast({ title: "Update failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const markJobDone = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered", serviceCompletedAt: new Date().toISOString() })
        .eq("id", orderId)
        .eq("sellerId", user!.id);
      if (error) throw error;

      const order = orders.find((o) => o.id === orderId);
      if (order?.buyerId) {
        await supabase.from("notifications").insert({
          userId: order.buyerId,
          type: "delivery",
          title: "Job completed — please confirm",
          message: `${order.orderNumber}: your provider has marked this job as complete. Please confirm or open a dispute within 7 days.`,
          link: "/buyer/orders",
        });
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "delivered" } : o))
      );
      toast({ title: "Job marked as done", description: "The client has been notified to confirm." });
    } catch (err) {
      toast({ title: "Update failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1200px]">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? "Loading…" : `${orders.length} orders total`}
        </p>
      </div>

      {/* Awaiting-payment highlight banner */}
      {!loading && orders.some((o) => o.status === "awaiting_payment") && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5">
          <span className="text-amber-500 text-xl leading-none mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              {orders.filter((o) => o.status === "awaiting_payment").length} accepted offer{orders.filter((o) => o.status === "awaiting_payment").length > 1 ? "s" : ""} awaiting buyer payment
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Items are reserved for 15 minutes. If payment isn't completed the reservation expires automatically.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">

        {/* ── Mobile: card list ─────────────────────────────────── */}
        <div className="sm:hidden divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading orders…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {search ? "No orders match your search." : "No orders yet."}
            </div>
          ) : (
            filtered.map((o) => (
              <div key={o.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{o.orderNumber}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${statusColors[o.status] ?? "bg-muted text-muted-foreground"}`}>
                    {o.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{o.buyerName}</span>
                  <span className="text-sm font-bold text-foreground">£{o.total.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => navigate(`/tracking/${o.orderNumber || o.id}`)}
                    >
                      View
                    </Button>
                    {["paid", "packed", "shipped"].includes(o.status) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={actionLoading === o.id}
                          >
                            Update <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {o.status === "paid" && (
                            <DropdownMenuItem onClick={() => updateOrderStatus(o.id, "packed")}>
                              Mark as Packed
                            </DropdownMenuItem>
                          )}
                          {(o.status === "paid" || o.status === "packed") && (
                            <DropdownMenuItem onClick={() => updateOrderStatus(o.id, "shipped")}>
                              Mark as In Progress
                            </DropdownMenuItem>
                          )}
                          {o.status === "shipped" && (
                            <DropdownMenuItem onClick={() => markJobDone(o.id)}>
                              Mark Job Done
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Desktop: table ────────────────────────────────────── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Order</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Buyer</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Total</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Date</th>
                <th className="text-right text-xs font-semibold text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">Loading orders…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    {search ? "No orders match your search." : "No orders yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 text-sm font-medium text-foreground">{o.orderNumber}</td>
                    <td className="p-4 text-sm text-foreground">{o.buyerName}</td>
                    <td className="p-4 text-sm font-semibold text-foreground">£{o.total.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColors[o.status] ?? "bg-muted text-muted-foreground"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{formatDate(o.createdAt)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => navigate(`/tracking/${o.orderNumber || o.id}`)}
                        >
                          View
                        </Button>
                        {["paid", "packed", "shipped"].includes(o.status) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs gap-1"
                                disabled={actionLoading === o.id}
                              >
                                Update <ChevronDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {o.status === "paid" && (
                                <DropdownMenuItem onClick={() => updateOrderStatus(o.id, "packed")}>
                                  Mark as Packed
                                </DropdownMenuItem>
                              )}
                              {(o.status === "paid" || o.status === "packed") && (
                                <DropdownMenuItem onClick={() => updateOrderStatus(o.id, "shipped")}>
                                  Mark as In Progress
                                </DropdownMenuItem>
                              )}
                              {o.status === "shipped" && (
                                <DropdownMenuItem onClick={() => markJobDone(o.id)}>
                                  Mark Job Done
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default SellerOrders;
