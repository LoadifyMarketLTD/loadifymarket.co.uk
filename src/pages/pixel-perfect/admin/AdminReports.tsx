import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, Users, Package,
  ShoppingCart, Download, Calendar, Loader2,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

interface KPI {
  label: string;
  value: string;
  change: string;
  up: boolean;
  icon: React.ElementType;
  period: string;
}

interface TopSeller {
  name: string;
  totalSales: number;
  rating: number;
}

interface OrderBreakdown {
  status: string;
  count: number;
}

const AdminReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [orderBreakdown, setOrderBreakdown] = useState<OrderBreakdown[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const [usersRes, productsRes, ordersRes, approvedSellersRes, topSellersRes, allOrdersRes] =
          await Promise.all([
            supabase.from("users").select("id", { count: "exact", head: true }),
            supabase.from("products").select("id", { count: "exact", head: true }).eq("isActive", true),
            supabase.from("orders").select("total"),
            supabase
              .from("seller_profiles")
              .select("userId", { count: "exact", head: true })
              .eq("isApproved", true),
            supabase
              .from("seller_profiles")
              .select("userId, storeName, businessName, rating, totalSales")
              .gt("rating", 0)
              .order("totalSales", { ascending: false })
              .limit(5),
            supabase.from("orders").select("status"),
          ]);

        const totalRevenue = (ordersRes.data || []).reduce((sum: number, o) => sum + (o.total ?? 0), 0);
        const totalOrders = ordersRes.data?.length ?? 0;

        setKpis([
          {
            label: "Total Users",
            value: (usersRes.count ?? 0).toLocaleString(),
            change: "Registered",
            up: true,
            icon: Users,
            period: "All time",
          },
          {
            label: "Active Products",
            value: (productsRes.count ?? 0).toLocaleString(),
            change: "Listed",
            up: true,
            icon: Package,
            period: "Currently active",
          },
          {
            label: "Total Revenue",
            value: `£${totalRevenue.toLocaleString()}`,
            change: "From all orders",
            up: true,
            icon: ShoppingCart,
            period: "All time",
          },
          {
            label: "Total Orders",
            value: totalOrders.toLocaleString(),
            change: "All time",
            up: true,
            icon: ShoppingCart,
            period: "Platform-wide",
          },
          {
            label: "Approved Sellers",
            value: (approvedSellersRes.count ?? 0).toLocaleString(),
            change: "Verified",
            up: true,
            icon: Users,
            period: "Active sellers",
          },
        ]);

        const sellers: TopSeller[] = (topSellersRes.data || []).map((s) => {
          const name = s.storeName || s.businessName || s.userId?.slice(0, 8).toUpperCase() || "—";
          return { name, totalSales: s.totalSales ?? 0, rating: s.rating ?? 0 };
        });
        setTopSellers(sellers);

        const statusCounts: Record<string, number> = {};
        (allOrdersRes.data || []).forEach((o) => {
          const st = o.status ?? "unknown";
          statusCounts[st] = (statusCounts[st] ?? 0) + 1;
        });
        setOrderBreakdown(
          Object.entries(statusCounts)
            .map(([status, count]) => ({ status, count }))
            .sort((a, b) => b.count - a.count)
        );
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to load reports");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform performance overview and insights.</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="default"><Download className="mr-2 h-4 w-4" /> Export</Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 flex items-center justify-center h-28">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ))
          : kpis.map((k) => (
              <Card key={k.label}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <k.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className={`text-xs font-medium flex items-center gap-1 ${k.up ? "text-emerald-600" : "text-destructive"}`}>
                      {k.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {k.change}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-3">{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label} · {k.period}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Breakdown</CardTitle>
            <CardDescription>Orders by status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orderBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No order data yet.</p>
            ) : (
              <div className="space-y-3">
                {orderBreakdown.map((o) => (
                  <div key={o.status} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground capitalize">{o.status}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{o.count} orders</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Sellers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Sellers</CardTitle>
            <CardDescription>By total sales volume</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : topSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No seller data yet.</p>
            ) : (
              <div className="space-y-3">
                {topSellers.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">⭐ {s.rating.toFixed(1)} rating</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground shrink-0">
                      {s.totalSales} sales
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminReports;
