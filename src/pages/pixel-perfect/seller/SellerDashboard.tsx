import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package, ShoppingCart, PoundSterling, TrendingUp,
  Eye, Users, Star, Truck, Send, Loader2, MessageSquare,
  AlertCircle, CheckCircle2, Store
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import type { User } from "@/types";
import { toast } from "@/hooks/use-toast";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import {
  buildSellerProductMetrics,
  RECOGNISED_SELLER_SALE_STATUSES,
  type SellerProductMetric,
} from "@/lib/sellerDashboardMetrics";

type BuyerData = Pick<User, "id" | "firstName" | "lastName">;

interface DashboardStats {
  totalRevenue: number;
  activeOrders: number;
  productsListed: number;
  totalCustomers: number;
  pendingShipments: number;
  lowStockItems: number;
  outOfStockItems: number;
  sellerRating: number;
  todayOrders: number;
  todayMessages: number | null;
  unreadMessages: number | null;
}

interface SellerHealth {
  sellerStatus: string | null;
  stripeConnectStatus: string | null;
  profileCompleteness: number | null;
  isPaused: boolean;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  buyerName: string;
  total: number;
  status: string;
  createdAt: string;
}

interface OrderItemMetricRow {
  orderId: string;
  productId: string;
  quantity: number | string;
  subtotal: number | string;
}

const statusColors: Record<string, string> = {
  paid: "bg-blue-500/10 text-blue-700 border-blue-200",
  packed: "bg-primary/10 text-primary border-primary/40",
  shipped: "bg-secondary/10 text-secondary border-secondary/20",
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

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const SellerDashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sellerHealth, setSellerHealth] = useState<SellerHealth | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<SellerProductMetric[]>([]);
  const [productMetricsAvailable, setProductMetricsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<{ availableAmount: number; pendingAmount: number; totalEarned: number } | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const [productsRes, allOrdersRes, profileRes, balanceRes, todayMessagesRes, unreadMessagesRes] = await Promise.all([
          supabase
            .from("products")
            .select("id, title, views, addToCartCount, stockQuantity, isActive, listingContext")
            .eq("sellerId", user.id),
          supabase
            .from("orders")
            .select(`id, orderNumber, total, status, createdAt, buyerId, buyerNameSnapshot, commercialSnapshotSource`)
            .eq("sellerId", user.id)
            .order("createdAt", { ascending: false }),
          supabase
            .from("seller_profiles")
            .select("rating, sellerStatus, stripeConnectStatus, profileCompleteness, isPaused")
            .eq("userId", user.id)
            .maybeSingle(),
          supabase
            .from("seller_balance")
            .select("availableAmount, pendingAmount, totalEarned")
            .eq("sellerId", user.id)
            .maybeSingle(),
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("receiverId", user.id)
            .gte("createdAt", startOfToday.toISOString()),
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("receiverId", user.id)
            .eq("isRead", false),
        ]);

        const products = productsRes.data ?? [];
        const orders = (allOrdersRes.data ?? []) as Array<{
          id: string;
          orderNumber: string;
          total: number;
          status: string;
          createdAt: string;
          buyerId: string;
          buyerNameSnapshot: string | null;
          commercialSnapshotSource: string | null;
        }>;

        const activeOrders = orders.filter((o) => ["paid", "packed", "shipped"].includes(o.status)).length;
        const totalRevenue = orders
          .filter((o) => RECOGNISED_SELLER_SALE_STATUSES.has(o.status))
          .reduce((sum, o) => sum + (o.total || 0), 0);
        const productsListed = products.filter((p) => p.isActive).length;
        const lowStockItems = products.filter((p) =>
          p.listingContext !== "service" &&
          p.stockQuantity !== null && p.stockQuantity > 0 && p.stockQuantity <= 5
        ).length;
        const outOfStockItems = products.filter((p) =>
          p.listingContext !== "service" &&
          p.stockQuantity !== null && p.stockQuantity <= 0
        ).length;

        const uniqueBuyerIds = [...new Set(orders.map((o) => o.buyerId).filter(Boolean))];
        const todayOrders = orders.filter((o) => new Date(o.createdAt) >= startOfToday).length;

        setStats({
          totalRevenue,
          activeOrders,
          productsListed,
          totalCustomers: uniqueBuyerIds.length,
          pendingShipments: orders.filter((o) => o.status === "paid" || o.status === "packed").length,
          lowStockItems,
          outOfStockItems,
          sellerRating: profileRes.data?.rating ?? 0,
          todayOrders,
          todayMessages: todayMessagesRes.count ?? null,
          unreadMessages: unreadMessagesRes.count ?? null,
        });

        setSellerHealth({
          sellerStatus: profileRes.data?.sellerStatus ?? null,
          stripeConnectStatus: profileRes.data?.stripeConnectStatus ?? null,
          profileCompleteness: profileRes.data?.profileCompleteness ?? null,
          isPaused: profileRes.data?.isPaused ?? false,
        });

        // Snapshot identity is authoritative for post-cutover commercial history.
        // Query current users only for recent legacy rows with no authoritative
        // snapshot, and never persist this fallback into historical records.
        const recentFive = orders.slice(0, 5);
        const legacyBuyerIds = [...new Set(
          recentFive
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

        setRecentOrders(
          recentFive.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            buyerName: o.commercialSnapshotSource && o.buyerNameSnapshot?.trim()
              ? o.buyerNameSnapshot.trim()
              : legacyBuyerNames[o.buyerId] ?? "Customer",
            total: o.total,
            status: o.status,
            createdAt: o.createdAt,
          }))
        );

        // Product commercial metrics must come from canonical order_items, not
        // from product engagement counters. Fetch only recognised sale orders,
        // in bounded chunks, under the seller's existing RLS policies.
        const recognisedOrderIds = orders
          .filter((order) => RECOGNISED_SELLER_SALE_STATUSES.has(order.status))
          .map((order) => order.id);
        const orderItems: OrderItemMetricRow[] = [];
        let metricsAvailable = true;

        for (let offset = 0; offset < recognisedOrderIds.length; offset += 100) {
          const batch = recognisedOrderIds.slice(offset, offset + 100);
          const { data, error } = await supabase
            .from("order_items")
            .select("orderId, productId, quantity, subtotal")
            .in("orderId", batch);

          if (error) {
            console.error("SellerDashboard: unable to read product commercial metrics", error);
            metricsAvailable = false;
            break;
          }
          orderItems.push(...((data ?? []) as OrderItemMetricRow[]));
        }

        setProductMetricsAvailable(metricsAvailable);
        if (metricsAvailable) {
          setTopProducts(buildSellerProductMetrics(products, orders, orderItems).slice(0, 4));
        } else {
          // Engagement data can still be shown truthfully. Commercial values are
          // rendered as em-dashes instead of fabricated zeroes.
          setTopProducts(
            products
              .map((product) => ({
                id: product.id,
                title: product.title,
                views: product.views ?? 0,
                cartAdds: product.addToCartCount ?? 0,
                orderCount: 0,
                unitsSold: 0,
                salesAmount: 0,
                conversionRate: 0,
              }))
              .sort((a, b) => b.views - a.views || b.cartAdds - a.cartAdds)
              .slice(0, 4),
          );
        }

        if (balanceRes.data) {
          setBalance({
            availableAmount: balanceRes.data.availableAmount ?? 0,
            pendingAmount: balanceRes.data.pendingAmount ?? 0,
            totalEarned: balanceRes.data.totalEarned ?? 0,
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
      setBalance((b) => b ? { ...b, pendingAmount: b.pendingAmount + b.availableAmount, availableAmount: 0 } : b);
    } catch (err: unknown) {
      toast({ title: "Payout failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setPayoutLoading(false);
    }
  };

  const statsCards = stats
    ? [
        {
          label: "Total Revenue (All Time)",
          value: `£${stats.totalRevenue.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`,
          change: "",
          trend: "up" as const,
          icon: PoundSterling,
          description: "all time",
          to: "/seller/orders",
        },
        {
          label: "Active Orders (Current)",
          value: String(stats.activeOrders),
          change: "",
          trend: "up" as const,
          icon: ShoppingCart,
          description: "in progress",
          to: "/seller/orders",
        },
        {
          label: "Products Listed (Total)",
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

  const thingsToDo = stats
    ? [
        ...(stats.pendingShipments > 0 ? [{
          label: `${stats.pendingShipments} order${stats.pendingShipments === 1 ? "" : "s"} to prepare or ship`,
          detail: "Keep buyers updated and dispatch on time.",
          to: "/seller/shipments",
          icon: Truck,
        }] : []),
        ...((stats.unreadMessages ?? 0) > 0 ? [{
          label: `${stats.unreadMessages} unread message${stats.unreadMessages === 1 ? "" : "s"}`,
          detail: "Reply to buyers from your Messages inbox.",
          to: "/seller/messages",
          icon: MessageSquare,
        }] : []),
        ...(stats.outOfStockItems > 0 ? [{
          label: `${stats.outOfStockItems} product${stats.outOfStockItems === 1 ? "" : "s"} out of stock`,
          detail: "Restock or review the affected listings.",
          to: "/seller/products",
          icon: Package,
        }] : []),
        ...(stats.lowStockItems > 0 ? [{
          label: `${stats.lowStockItems} product${stats.lowStockItems === 1 ? "" : "s"} running low`,
          detail: "Check stock before the next order arrives.",
          to: "/seller/products",
          icon: AlertCircle,
        }] : []),
        ...(sellerHealth?.isPaused ? [{
          label: "Your shop is paused",
          detail: "Listings are hidden until you resume selling.",
          to: "/seller/settings",
          icon: Store,
        }] : []),
        ...(sellerHealth && sellerHealth.stripeConnectStatus !== "active" ? [{
          label: "Payment setup needs attention",
          detail: "Review your Stripe Connect status before receiving payouts.",
          to: "/seller/settings",
          icon: PoundSterling,
        }] : []),
      ]
    : [];

  const shopStatus = sellerHealth?.isPaused
    ? { label: "Shop paused", detail: "Your listings are currently hidden." }
    : sellerHealth?.sellerStatus === "active"
      ? { label: "Shop active", detail: "Your seller workspace is ready for orders." }
      : { label: "Setup in progress", detail: "Complete any remaining seller setup steps." };

  return (
    <div className="px-3 pt-3 pb-4 sm:p-6 space-y-3 sm:space-y-6 max-w-[1200px]">
      <OnboardingChecklist />

      {/* Essentials is additive: the existing dashboard remains below. */}
      <div className="bg-card rounded-lg border border-border p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Seller Essentials</span>
              <span className="text-[10px] text-muted-foreground">Your day at a glance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {greetingForNow()}, {user?.firstName || "Seller"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">See what needs attention without digging through the workspace.</p>
          </div>
          <Link to={sellerHealth?.isPaused ? "/seller/settings" : "/seller/profile"} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 bg-background hover:bg-muted/30 transition-colors">
            {sellerHealth?.isPaused ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-success" />}
            <div>
              <p className="text-xs font-semibold text-foreground">{shopStatus.label}</p>
              <p className="text-[10px] text-muted-foreground">{shopStatus.detail}</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Button size="sm" className="bg-primary hover:bg-primary-hover text-black h-10 text-sm font-extrabold shadow-[0_0_18px_rgba(212,175,55,0.35)] ring-1 ring-primary/40" asChild>
          <Link to="/seller/products/new"><Package className="mr-1.5 h-4 w-4" /> Add Product</Link>
        </Button>
        <Button size="sm" variant="outline" className="h-10 text-sm font-semibold border-primary/40 hover:border-primary" asChild>
          <Link to="/seller/shipments"><Truck className="mr-1.5 h-4 w-4 text-primary" /> Log Shipment</Link>
        </Button>
      </div>

      {/* Additive Essentials task list — no existing workspace area is removed. */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-3 py-2.5 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Things to do</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Only items that may need your attention.</p>
        </div>
        {loading ? (
          <div className="px-3 py-4 text-xs text-muted-foreground">Checking your shop…</div>
        ) : thingsToDo.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-4">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">You're all caught up</p>
              <p className="text-[10px] text-muted-foreground">Nothing needs your attention right now.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {thingsToDo.map((item) => (
              <Link key={`${item.to}-${item.label}`} to={item.to} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.detail}</p>
                </div>
                <span className="text-xs font-medium text-primary">View</span>
              </Link>
            ))}
          </div>
        )}
      </div>

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

      {balance && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-lg border border-border p-3 space-y-1.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Available</p>
            <p className="font-bold text-base text-foreground leading-tight">
              £{balance.availableAmount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <Button size="sm" className="h-7 text-xs w-full px-2" onClick={handleRequestPayout} disabled={payoutLoading || balance.availableAmount <= 0}>
              {payoutLoading ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Requesting…</> : <><Send className="mr-1 h-3 w-3" /> Payout</>}
            </Button>
          </div>
          <div className="bg-card rounded-lg border border-border p-3 space-y-1">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Pending</p>
            <p className="font-bold text-base text-foreground leading-tight">
              £{balance.pendingAmount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground">In payout review</p>
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

      <div className="bg-card rounded-lg border border-border p-3">
        <h2 className="text-sm font-semibold text-foreground mb-2">Today</h2>
        {loading || !stats ? (
          <p className="text-xs text-muted-foreground">No activity yet today</p>
        ) : stats.todayOrders === 0 && (stats.todayMessages ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">No activity yet today</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <p className="text-muted-foreground">Orders created: <span className="text-foreground font-semibold">{stats.todayOrders}</span></p>
            <p className="text-muted-foreground">Messages: <span className="text-foreground font-semibold">{stats.todayMessages ?? 0}</span></p>
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg border border-border">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recent Orders</h2>
          <Link to="/seller/orders" className="text-xs text-primary font-medium">View All</Link>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="px-3 py-4 text-center text-muted-foreground text-xs">Loading orders…</div>
          ) : recentOrders.length === 0 ? (
            <div className="px-3 py-4 text-center text-muted-foreground text-xs">
              <p>No orders yet.</p>
              <p className="mt-1">Start by listing your first product.</p>
            </div>
          ) : (
            recentOrders.map((order) => (
              <Link key={order.id} to={`/seller/orders`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 active:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-foreground">{order.orderNumber}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border capitalize shrink-0 ${statusColors[order.status] ?? "bg-muted text-muted-foreground"}`}>{order.status}</span>
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

      <div className="bg-card rounded-lg border border-border">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Top Products</h2>
            <p className="text-[10px] text-muted-foreground">Ranked by sales, then orders and engagement</p>
          </div>
          <Link to="/seller/products" className="text-xs text-primary font-medium">View All</Link>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="px-3 py-4 text-center text-muted-foreground text-xs">Loading…</div>
          ) : topProducts.length === 0 ? (
            <div className="px-3 py-4 text-center text-muted-foreground text-xs">
              <p>No products yet.</p>
              <p className="mt-1">Start by listing your first product.</p>
            </div>
          ) : (
            topProducts.map((prod, i) => (
              <div key={prod.id} className="flex items-start gap-3 px-3 py-2.5">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{prod.title}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <PoundSterling className="h-3 w-3" />
                      Sales: {productMetricsAvailable ? `£${prod.salesAmount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <ShoppingCart className="h-3 w-3" />
                      Orders: {productMetricsAvailable ? prod.orderCount : "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Units: {productMetricsAvailable ? prod.unitsSold : "—"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Views: {prod.views}</span>
                    <span>Cart adds: {prod.cartAdds}</span>
                    <span>Conversion: {productMetricsAvailable ? `${prod.conversionRate.toFixed(1)}%` : "—"}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-3">
        <h2 className="text-sm font-semibold text-foreground mb-2.5">Quick Stats</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Star className="h-3.5 w-3.5 text-accent" /> Rating</span>
            <span className="text-[12px] font-semibold text-foreground">{loading ? "—" : stats?.sellerRating ? `${stats.sellerRating.toFixed(1)}` : "—"}</span>
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
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Package className="h-3.5 w-3.5 text-primary" /> Out of Stock</span>
            <span className={`text-[12px] font-semibold ${(stats?.outOfStockItems ?? 0) > 0 ? "text-destructive" : "text-foreground"}`}>
              {loading ? "—" : stats?.outOfStockItems ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><MessageSquare className="h-3.5 w-3.5 text-primary" /> Unread</span>
            <span className="text-[12px] font-semibold text-foreground">{loading ? "—" : stats?.unreadMessages ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
