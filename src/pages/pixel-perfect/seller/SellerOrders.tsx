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
import { authorizedFetch } from "@/lib/authorizedFetch";
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
  listingContext: string | null;
}

const statusColors: Record<string, string> = {
  awaiting_payment: "bg-primary/20 text-primary ring-1 ring-amber-400/40",
  paid: "bg-blue-500/10 text-blue-700",
  packed: "bg-primary/10 text-primary",
  shipped: "bg-purple-500/10 text-purple-700",
  delivered: "bg-orange-500/10 text-orange-700",
  completed: "bg-success/10 text-success",
  cancelled: "bg-danger/100/10 text-danger",
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadError(null);
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("id, orderNumber, total, status, createdAt, buyerId, productId, buyerNameSnapshot, commercialSnapshotSource")
        .eq("sellerId", user.id)
        .order("createdAt", { ascending: false });

      if (fetchError) {
        console.error("SellerOrders: fetch error", fetchError);
        setLoadError("Failed to load orders. Please refresh the page.");
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as Array<{
        id: string;
        orderNumber: string;
        total: number;
        status: string;
        createdAt: string;
        buyerId: string;
        productId: string;
        buyerNameSnapshot: string | null;
        commercialSnapshotSource: string | null;
      }>;

      const legacyBuyerIds = [...new Set(
        rows
          .filter((o) => !o.commercialSnapshotSource || !o.buyerNameSnapshot?.trim())
          .map((o) => o.buyerId)
          .filter(Boolean),
      )];
      const legacyBuyerNames: Record<string, string> = {};
      if (legacyBuyerIds.length > 0) {
        const { data: buyers } = await supabase
          .from("users")
          .select("id, firstName, lastName")
          .in("id", legacyBuyerIds);
        (buyers ?? []).forEach((b: BuyerData) => {
          const name = [b.firstName, b.lastName].filter(Boolean).join(" ").trim();
          legacyBuyerNames[b.id] = name || "Customer";
        });
      }

      const productIds = [...new Set(rows.map((o) => o.productId).filter(Boolean))];
      const listingContextByProductId: Record<string, string | null> = {};
      if (productIds.length > 0) {
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("id, listingContext")
          .in("id", productIds);
        if (productsError) {
          console.warn("SellerOrders: product context lookup failed", productsError);
        } else {
          (products ?? []).forEach((product: { id: string; listingContext: string | null }) => {
            listingContextByProductId[product.id] = product.listingContext ?? null;
          });
        }
      }

      setOrders(
        rows.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          buyerId: o.buyerId,
          buyerName: o.commercialSnapshotSource && o.buyerNameSnapshot?.trim()
            ? o.buyerNameSnapshot.trim()
            : legacyBuyerNames[o.buyerId] ?? "Customer",
          total: o.total,
          status: o.status,
          createdAt: o.createdAt,
          listingContext: listingContextByProductId[o.productId] ?? null,
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
      const res = await authorizedFetch("/.netlify/functions/seller-order-status", {
        method: "POST",
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to update order status");

      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      toast({ title: "Order updated", description: `Status changed to ${newStatus}.` });
    } catch (err) {
      toast({ title: "Update failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const markDelivered = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const res = await authorizedFetch("/.netlify/functions/seller-order-status", {
        method: "POST",
        body: JSON.stringify({ orderId, status: "delivered" }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to mark order as delivered");

      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "delivered" } : o)));
      toast({ title: "Job marked as completed", description: "The buyer has been notified to confirm completion." });
    } catch (err) {
      toast({ title: "Update failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const renderShippedAction = (o: Order) => {
    if (o.status !== "shipped") return null;
    if (o.listingContext === "service") {
      return <DropdownMenuItem onClick={() => markDelivered(o.id)}>Mark Job as Completed</DropdownMenuItem>;
    }
    return <DropdownMenuItem onClick={() => navigate("/seller/shipments")}>Manage Shipment</DropdownMenuItem>;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1200px]">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">{loading ? "Loading…" : `${orders.length} orders total`}</p>
      </div>

      {!loading && orders.some((o) => o.status === "awaiting_payment") && (
        <div className="flex items-start gap-3 rounded-xl bg-primary/10 border border-primary/40 p-3.5">
          <span className="text-primary text-xl leading-none mt-0.5">⚠</span>
          <div>
            {(() => {
              const awaitingCount = orders.filter((o) => o.status === "awaiting_payment").length;
              return (
                <p className="text-sm font-semibold text-primary dark:text-primary">
                  {awaitingCount} order{awaitingCount > 1 ? "s" : ""} awaiting buyer payment
                </p>
              );
            })()}
            <p className="text-xs text-primary dark:text-primary mt-0.5">
              Items are reserved for 15 minutes. If payment isn't completed the reservation expires automatically.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." className="pl-9 h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="sm:hidden divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading orders…</div>
          ) : loadError ? (
            <div className="p-8 text-center text-sm text-red-500">{loadError}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {search ? "No orders match your search." : "No orders yet. Start by listing your first product."}
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
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate(`/tracking/${o.orderNumber || o.id}`)}>View</Button>
                    {["paid", "packed", "shipped"].includes(o.status) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled={actionLoading === o.id}>
                            Update <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {o.status === "paid" && <DropdownMenuItem onClick={() => updateOrderStatus(o.id, "packed")}>Mark as Packed</DropdownMenuItem>}
                          {(o.status === "paid" || o.status === "packed") && <DropdownMenuItem onClick={() => updateOrderStatus(o.id, "shipped")}>Mark as Shipped</DropdownMenuItem>}
                          {renderShippedAction(o)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

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
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">Loading orders…</td></tr>
              ) : loadError ? (
                <tr><td colSpan={6} className="p-8 text-center text-sm text-red-500">{loadError}</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    {search ? "No orders match your search." : "No orders yet. Start by listing your first product."}
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 text-sm font-medium text-foreground">{o.orderNumber}</td>
                    <td className="p-4 text-sm text-foreground">{o.buyerName}</td>
                    <td className="p-4 text-sm font-semibold text-foreground">£{o.total.toLocaleString()}</td>
                    <td className="p-4"><span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColors[o.status] ?? "bg-muted text-muted-foreground"}`}>{o.status}</span></td>
                    <td className="p-4 text-sm text-muted-foreground">{formatDate(o.createdAt)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/tracking/${o.orderNumber || o.id}`)}>View</Button>
                        {["paid", "packed", "shipped"].includes(o.status) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-xs gap-1" disabled={actionLoading === o.id}>Update <ChevronDown className="h-3 w-3" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {o.status === "paid" && <DropdownMenuItem onClick={() => updateOrderStatus(o.id, "packed")}>Mark as Packed</DropdownMenuItem>}
                              {(o.status === "paid" || o.status === "packed") && <DropdownMenuItem onClick={() => updateOrderStatus(o.id, "shipped")}>Mark as Shipped</DropdownMenuItem>}
                              {renderShippedAction(o)}
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
