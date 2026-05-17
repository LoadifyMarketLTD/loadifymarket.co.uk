import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package, ShoppingCart, PoundSterling, TrendingUp,
  Eye, Users, Star, Truck, Send, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import type { User } from "@/types";
import { toast } from "@/hooks/use-toast";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";

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
  packed: "bg-primary/10 text-primary border-primary/40",
  shipped: "bg-[#0A2239]/10 text-secondary border-[#0A2239]/20",
  delivered: "bg-success/10 text-success border-success/40",
  cancelled: "bg-danger/100/10 text-danger border-danger/30",
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
        const activeOrders = orders.filter((o) => ["paid", "packed", "shipped"].includes(o.status)).length;
        // Only count revenue from orders that have actually been paid — exclude
        // awaiting_payment, cancelled and refunded so the KPI reflects real income.
        const PAID_STATUSES = ["paid", "packed", "shipped", "delivered", "completed"];
        const totalRevenue = orders
          .filter((o) => PAID_STATUSES.includes(o.status))
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

  const statsCards = stats
    ? [
        {
          label: "Total Revenue",
          value: `£${stats.totalRevenue.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`,
          change: "",
          trend: "up" as const,
          icon: PoundSterling,
          description: "all time",
          to: "/seller/orders",
        },
        {
          label: "Active Orders",
          value: String(stats.activeOrders),
          change: "",
          trend: "up" as const,
          icon: ShoppingCart,
          description: "in progress",
          to: "/seller/orders",
        },
        {
          label: "Products Listed",
          value: String(stats.productsListed),
          change: "",
          trend: "up" as const,
          icon: Package,
          description: "active",
          to: "/seller/products",
        },
        {
          label: "Low Stock",
          value: String(stats.lowStockItems),
          change: "",
          trend: stats.lowStockItems > 0 ? ("down" as const) : ("up" as const),
          icon: TrendingUp,
          description: "items ≤ 5 units",
          to: "/seller/products",
        },
      ]
    : [];

  return (
    <div className="px-3 pt-3 pb-4 sm:p-6 space-y-3 sm:space-y-6 max-w-[1200px]">
      {/* Onboarding compact row — shown only to sellers who haven't completed setup */}
      <OnboardingChecklist />

      {/* Quick Actions — top priority, horizontal row */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Button size="sm" className="bg-gradient-hero text-primary-foreground h-10 text-sm font-semibold" asChild>
          <Link to="/seller/products/new">
            <Package className="mr-1.5 h-4 w-4" /> Add Product
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="h-10 text-sm font-semibold border-primary/40 hover:border-primary" asChild>
          <Link to="/seller/shipments">
            <Truck className="mr-1.5 h-4 w-4 text-primary" /> Log Shipment
          </Link>
        </Button>
      </div>

      {/* Stats Grid — compact 2×2 */}
      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-3 h-16 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {statsCards.map((stat) => (
            <Link
              key={stat.label}
              to={stat.to}
              aria-label={`View ${stat.label.toLowerCase()}`}
              className="flex items-center gap-3 bg-card rounded-lg border border-border px-3 py-2.5 hover:bg-muted/30 active:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-lg leading-tight text-foreground">{stat.value}</div>
                <p className="text-[11px] text-muted-foreground truncate">{stat.label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Balance row — compact */}
      {balance && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-card rounded-lg border border-border p-3 space-y-1.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Available</p>
            <p className="font-bold text-base text-foreground leading-tight">
              £{balance.availableAmount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <Button
              size="sm"
              className="h-7 text-xs w-full px-2"
              onClick={handleRequestPayout}
              disabled={payoutLoading || balance.availableAmount <= 0}
            >
              {payoutLoading ? (
                <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Requesting…</>
              ) : (
                <><Send className="mr-1 h-3 w-3" /> Payout</>
              )}
            </Button>
          </div>
          <div className="bg-card rounded-lg border border-border p-3 space-y-1">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total Earned</p>
            <p className="font-bold text-base text-foreground leading-tight">
              £{balance.totalEarned.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground">All time</p>
          </div>
        </div>
      )}

      {/* Recent Orders — mobile card list */}
      <div className="bg-card rounded-lg border border-border">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recent Orders</h2>
          <Link to="/seller/orders" className="text-xs text-primary font-medium">View All</Link>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="px-3 py-4 text-center text-muted-foreground text-xs">Loading orders…</div>
          ) : recentOrders.length === 0 ? (
            <div className="px-3 py-4 text-center text-muted-foreground text-xs">No orders yet.</div>
          ) : (
            recentOrders.map((order) => (
              <Link key={order.id} to={`/seller/orders`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 active:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-foreground">{order.orderNumber}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border capitalize shrink-0 ${statusColors[order.status] ?? "bg-muted text-muted-foreground"}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{order.buyerName}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13px] font-bold text-foreground">£{order.total.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">{timeAgo(order.createdAt)}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Top Products — compact list */}
      <div className="bg-card rounded-lg border border-border">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Top Products</h2>
          <Link to="/seller/products" className="text-xs text-primary font-medium">View All</Link>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="px-3 py-4 text-center text-muted-foreground text-xs">Loading…</div>
          ) : topProducts.length === 0 ? (
            <div className="px-3 py-4 text-center text-muted-foreground text-xs">No products yet.</div>
          ) : (
            topProducts.map((prod, i) => (
              <div key={prod.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{prod.title}</p>
                  <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {prod.views}</span>
                    <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> {prod.addToCartCount}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Stats — compact grid */}
      <div className="bg-card rounded-lg border border-border p-3">
        <h2 className="text-sm font-semibold text-foreground mb-2.5">Quick Stats</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Star className="h-3.5 w-3.5 text-accent" /> Rating</span>
            <span className="text-[12px] font-semibold text-foreground">
              {loading ? "—" : stats?.sellerRating ? `${stats.sellerRating.toFixed(1)}` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Users className="h-3.5 w-3.5 text-primary" /> Customers</span>
            <span className="text-[12px] font-semibold text-foreground">{loading ? "—" : stats?.totalCustomers ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Truck className="h-3.5 w-3.5 text-primary" /> Pending</span>
            <span className="text-[12px] font-semibold text-foreground">{loading ? "—" : stats?.pendingShipments ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Package className="h-3.5 w-3.5 text-primary" /> Low Stock</span>
            <span className={`text-[12px] font-semibold ${(stats?.lowStockItems ?? 0) > 0 ? "text-destructive" : "text-foreground"}`}>
              {loading ? "—" : stats?.lowStockItems ?? 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
