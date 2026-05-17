import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, TrendingUp, ArrowUpRight, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";

interface OrderRow {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  products: { title: string } | null;
}

interface WishlistProduct {
  id: string;
  title: string;
  price: number;
  images: string[];
}

const statusColor: Record<string, string> = {
  pending: "bg-primary/15 text-primary border-primary/40",
  paid: "bg-primary/15 text-primary border-primary/40",
  packed: "bg-primary/15 text-primary border-primary/40",
  shipped: "bg-blue-500/15 text-blue-700 border-blue-200",
  delivered: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
  refunded: "bg-destructive/15 text-destructive border-destructive/20",
};

const BuyerDashboard = () => {
  const { user } = useAuthStore();
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<WishlistProduct[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [ordersRes, wishlistRes] = await Promise.all([
          supabase
            .from("orders")
            .select("id, orderNumber, total, status, createdAt, products(title)")
            .eq("buyerId", user.id)
            .order("createdAt", { ascending: false }),
          supabase
            .from("wishlists")
            .select("productIds")
            .eq("userId", user.id)
            .maybeSingle(),
        ]);

        const allOrders = (ordersRes.data as unknown as OrderRow[]) || [];
        setRecentOrders(allOrders.slice(0, 5));
        setTotalOrders(allOrders.length);
        // Only count orders that have actually been paid/fulfilled — exclude
        // cancelled and refunded orders so the "Total Spent" stat is accurate.
        const completedStatuses = ["paid", "packed", "shipped", "delivered", "completed"];
        setTotalSpent(
          allOrders
            .filter((o) => completedStatuses.includes(o.status))
            .reduce((sum, o) => sum + (o.total || 0), 0)
        );

        const productIds: string[] =
          wishlistRes.data?.productIds || [];
        setWishlistCount(productIds.length);

        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("id, title, price, images")
            .in("id", productIds.slice(0, 3))
            .eq("isActive", true);
          setWishlistProducts((products as WishlistProduct[]) || []);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const inProgress = recentOrders.filter((o) =>
    ["pending", "paid", "packed", "shipped"].includes(o.status)
  ).length;

  const stats = [
    { label: "Total Orders", value: String(totalOrders), icon: ShoppingBag, desc: `${inProgress} in progress`, to: "/buyer/orders" },
    { label: "Wishlist Items", value: String(wishlistCount), icon: Heart, desc: "Saved for later", to: "/buyer/wishlist" },
    { label: "Total Spent", value: `£${totalSpent.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, desc: "All time", to: "/buyer/orders" },
  ];

  const firstName = (user as unknown as { firstName?: string } | null)?.firstName ?? "there";

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {firstName} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's a summary of your account activity.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} aria-label={`View ${s.label.toLowerCase()}`} className="block hover:scale-[1.02] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{loading ? "—" : s.value}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xs text-primary">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <CardDescription>Your latest purchases</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="text-xs" asChild>
              <Link to="/buyer/orders">
                View All <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No orders yet.</p>
            ) : (
              recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{o.orderNumber || o.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString("en-GB")}
                        {o.products?.title ? ` · ${o.products.title}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      £{(o.total ?? 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <Badge variant="outline" className={statusColor[o.status] ?? ""}>{o.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Wishlist Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Wishlist</CardTitle>
              <CardDescription>Saved for later</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="text-xs" asChild>
              <Link to="/buyer/wishlist">
                View All <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
            ) : wishlistProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No wishlist items.</p>
            ) : (
              wishlistProducts.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt={item.title} className="w-10 h-10 rounded-lg object-cover bg-muted" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Heart className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-primary font-semibold">
                      £{(item.price ?? 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BuyerDashboard;
