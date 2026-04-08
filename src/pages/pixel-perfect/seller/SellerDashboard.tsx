import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package, ShoppingCart, PoundSterling, TrendingUp, ArrowUpRight,
  ArrowDownRight, Eye, Users, Star, Truck, Clock, Send, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import type { User } from "@/types";
import { toast } from "@/hooks/use-toast";

type BuyerData = Pick<User, "id" | "firstName" | "lastName">;

interface DashboardStats {
  totalRevenue: number;
  activeOrders: number;
  productsListed: number;
  totalCustomers: number;
  pendingShipments: number;
  lowStockItems: number;
  sellerRating: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  buyerName: string;
  total: number;
  status: string;
  createdAt: string;
}

interface TopProduct {
  id: string;
  title: string;
  views: number;
  addToCartCount: number;
  revenue: number;
}

const statusColors: Record<string, string> = {
  paid: "bg-blue-500/10 text-blue-700 border-blue-200",
  packed: "bg-amber-500/10 text-amber-700 border-amber-200",
  shipped: "bg-purple-500/10 text-purple-700 border-purple-200",
  delivered: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-500/10 text-red-700 border-red-200",
  refunded: "bg-muted text-muted-foreground border-border",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

const SellerDashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<{ availableAmount: number; totalEarned: number } | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [productsRes, allOrdersRes, profileRes, balanceRes] = await Promise.all([
          supabase
            .from("products")
            .select("id, title, views, addToCartCount, stockQuantity, isActive")
            .eq("sellerId", user.id),
          supabase
            .from("orders")
            .select(`id, orderNumber, total, status, createdAt, buyerId`)
            .eq("sellerId", user.id)
            .order("createdAt", { ascending: false }),
          supabase
            .from("seller_profiles")
            .select("rating")
            .eq("userId", user.id)
            .maybeSingle(),
          supabase
            .from("seller_balance")
            .select("availableAmount, totalEarned")
            .eq("sellerId", user.id)
            .maybeSingle(),
        ]);

        const products = productsRes.data ?? [];
        const orders = (allOrdersRes.data ?? []) as Array<{
          id: string; orderNumber: string; total: number; status: string; createdAt: string; buyerId: string;
        }>;

        // Stats
        const activeOrders = orders.filter((o) => !["delivered", "cancelled", "refunded"].includes(o.status)).length;
        const totalRevenue = orders
          .filter((o) => o.status !== "cancelled" && o.status !== "refunded")
          .reduce((sum, o) => sum + (o.total || 0), 0);
        const productsListed = products.filter((p) => p.isActive).length;
        const lowStockItems = products.filter((p) => p.stockQuantity !== null && p.stockQuantity > 0 && p.stockQuantity <= 5).length;

        const uniqueBuyerIds = [...new Set(orders.map((o) => o.buyerId).filter(Boolean))];
        setStats({
          totalRevenue,
          activeOrders,
          productsListed,
          totalCustomers: uniqueBuyerIds.length,
          pendingShipments: orders.filter((o) => o.status === "paid" || o.status === "packed").length,
          lowStockItems,
          sellerRating: profileRes.data?.rating ?? 0,
        });

        // Resolve buyer names for recent orders
        const buyerNames: Record<string, string> = {};
        const recentBuyerIds = [...new Set(orders.slice(0, 5).map((o) => o.buyerId).filter(Boolean))];
        if (recentBuyerIds.length > 0) {
          const { data: buyers } = await supabase
            .from("users")
            .select("id, firstName, lastName")
            .in("id", recentBuyerIds);
          (buyers ?? []).forEach((b: BuyerData) => {
            const name = [b.firstName, b.lastName].filter(Boolean).join(" ").trim();
            buyerNames[b.id] = name || "Customer";
          });
        }

        // Recent orders (show last 5 only)
        setRecentOrders(
          orders.slice(0, 5).map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            buyerName: buyerNames[o.buyerId] ?? "Customer",
            total: o.total,
            status: o.status,
            createdAt: o.createdAt,
          }))
        );

        // Top products by views
        const sorted = [...products]
          .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
          .slice(0, 4);
        setTopProducts(
          sorted.map((p) => ({
            id: p.id,
            title: p.title,
            views: p.views ?? 0,
            addToCartCount: p.addToCartCount ?? 0,
            revenue: 0,
          }))
        );

        if (balanceRes.data) {
          setBalance({
            availableAmount: (balanceRes.data as { availableAmount: number; totalEarned: number }).availableAmount ?? 0,
            totalEarned: (balanceRes.data as { availableAmount: number; totalEarned: number }).totalEarned ?? 0,
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleRequestPayout = async () => {
    if (!balance || balance.availableAmount <= 0) {
      toast({ title: "No available balance", description: "You have no funds available for payout.", variant: "destructive" });
      return;
    }
    setPayoutLoading(true);
    try {
      const { error } = await supabase.rpc("request_payout", { p_amount: balance.availableAmount });
      if (error) throw error;
      toast({ title: "Payout requested", description: `A payout of £${balance.availableAmount.toFixed(2)} has been requested. It will be reviewed within 1–2 business days.` });
      setBalance((b) => b ? { ...b, availableAmount: 0 } : b);
    } catch (err: unknown) {
      toast({ title: "Payout failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setPayoutLoading(false);
    }
  };

  const displayName = user?.firstName ?? "Seller";

  const statsCards = stats
    ? [
        {
          label: "Total Revenue",
          value: `£${stats.totalRevenue.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`,
          change: "",
          trend: "up" as const,
          icon: PoundSterling,
          description: "all time",
        },
        {
          label: "Active Orders",
          value: String(stats.activeOrders),
          change: "",
          trend: "up" as const,
          icon: ShoppingCart,
          description: "in progress",
        },
        {
          label: "Products Listed",
          value: String(stats.productsListed),
          change: "",
          trend: "up" as const,
          icon: Package,
          description: "active",
        },
        {
          label: "Low Stock",
          value: String(stats.lowStockItems),
          change: "",
          trend: stats.lowStockItems > 0 ? ("down" as const) : ("up" as const),
          icon: TrendingUp,
          description: "items ≤ 5 units",
        },
      ]
    : [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {displayName}. Here's what's happening today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/pp/seller/products">View Products</Link>
          </Button>
          <Button size="sm" className="bg-gradient-hero text-primary-foreground" asChild>
            <Link to="/seller/products/new">
              <Package className="mr-2 h-4 w-4" /> Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-5 h-28 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl border border-border p-5 space-y-3 hover:shadow-card transition-shadow">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                {stat.change && (
                  <div className={`flex items-center gap-0.5 text-xs font-medium ${stat.trend === "up" ? "text-emerald-600" : "text-destructive"}`}>
                    {stat.trend === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {stat.change}
                  </div>
                )}
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label} · {stat.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Two-column section */}
      {balance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Available Balance</p>
              <p className="font-display text-2xl font-bold text-foreground">
                £{balance.availableAmount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">Ready for payout</p>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={handleRequestPayout}
              disabled={payoutLoading || balance.availableAmount <= 0}
            >
              {payoutLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Requesting…</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Request Payout</>
              )}
            </Button>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Earned</p>
            <p className="font-display text-2xl font-bold text-foreground">
              £{balance.totalEarned.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">All time</p>
          </div>
        </div>
      )}

      {/* Two-column section */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Recent Orders */}
        <div className="bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-display text-base font-semibold text-foreground">Recent Orders</h2>
            <Button variant="ghost" size="sm" className="text-xs text-primary" asChild>
              <Link to="/pp/seller/orders">View All</Link>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Loading orders…</div>
            ) : recentOrders.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No orders yet.</div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{order.orderNumber}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${statusColors[order.status] ?? "bg-muted text-muted-foreground"}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{order.buyerName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-foreground">£{order.total.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" /> {timeAgo(order.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Top Products */}
          <div className="bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display text-base font-semibold text-foreground">Top Products</h2>
              <Button variant="ghost" size="sm" className="text-xs text-primary" asChild>
                <Link to="/pp/seller/products">View All</Link>
              </Button>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Loading…</div>
              ) : topProducts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">No products yet.</div>
              ) : (
                topProducts.map((prod, i) => (
                  <div key={prod.id} className="flex items-center gap-3 p-4">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{prod.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {prod.views}</span>
                        <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> {prod.addToCartCount}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h2 className="font-display text-base font-semibold text-foreground">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 text-accent" /> Seller Rating
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {loading ? "—" : stats?.sellerRating ? `${stats.sellerRating.toFixed(1)} / 5.0` : "No ratings yet"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" /> Total Customers
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {loading ? "—" : stats?.totalCustomers ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4 text-primary" /> Pending Shipments
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {loading ? "—" : stats?.pendingShipments ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4 text-primary" /> Low Stock Items
                </div>
                <span className={`text-sm font-semibold ${(stats?.lowStockItems ?? 0) > 0 ? "text-destructive" : "text-foreground"}`}>
                  {loading ? "—" : stats?.lowStockItems ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
