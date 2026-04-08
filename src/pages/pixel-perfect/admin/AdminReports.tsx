import { useState, useEffect } from "react";
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
  const [period, setPeriod] = useState<"all" | "7d" | "30d">("all");

  const periodLabel: Record<string, string> = {
    all: "All time",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
  };

  const handleExport = () => {
    const rows: string[][] = [
      ["Platform KPIs"],
      ["Metric", "Value", "Period"],
      ...kpis.map((k) => [k.label, k.value, k.period]),
      [],
      ["Order Breakdown"],
      ["Status", "Count"],
      ...orderBreakdown.map((o) => [o.status, String(o.count)]),
      [],
      ["Top Sellers"],
      ["Name", "Total Sales", "Rating"],
      ...topSellers.map((s) => [s.name, String(s.totalSales), s.rating.toFixed(1)]),
    ];
    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `loadify-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        // Compute the ISO timestamp cutoff for the selected period
        let since: string | null = null;
        if (period === "7d") {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          since = d.toISOString();
        } else if (period === "30d") {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          since = d.toISOString();
        }

        const periodText = periodLabel[period];

        // Build period-filtered order queries
        let ordersQuery = supabase.from("orders").select("total");
        let allOrdersQuery = supabase.from("orders").select("status");
        if (since) {
          ordersQuery = ordersQuery.gte("createdAt", since);
          allOrdersQuery = allOrdersQuery.gte("createdAt", since);
        }

        const [usersRes, productsRes, ordersRes, approvedSellersRes, topSellersRes, allOrdersRes] =
          await Promise.all([
            supabase.from("users").select("id", { count: "exact", head: true }),
            supabase.from("products").select("id", { count: "exact", head: true }).eq("isActive", true),
            ordersQuery,
            supabase
              .from("seller_profiles")
              .select("userId", { count: "exact", head: true })
              .eq("sellerStatus", "active"),
            supabase
              .from("seller_profiles")
              .select("userId, storeName, businessName, rating, totalSales")
              .gt("rating", 0)
              .order("totalSales", { ascending: false })
              .limit(5),
            allOrdersQuery,
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
            change: "From orders",
            up: true,
            icon: ShoppingCart,
            period: periodText,
          },
          {
            label: "Total Orders",
            value: totalOrders.toLocaleString(),
            change: "Orders placed",
            up: true,
            icon: ShoppingCart,
            period: periodText,
          },
          {
            label: "Active Sellers",
            value: (approvedSellersRes.count ?? 0).toLocaleString(),
            change: "Active",
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
  }, [period]);

  return (
    <div className="p-6 space-y-6" style={{ background: "#0A0B1A", minHeight: "100%" }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reports & Analytics</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>Platform performance overview and insights.</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as "all" | "7d" | "30d")}>
            <SelectTrigger className="w-[140px]" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="default"
            onClick={handleExport}
            disabled={loading}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
          >
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border p-4 text-sm" style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 flex items-center justify-center h-28"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
              </div>
            ))
          : kpis.map((k) => (
              <div
                key={k.label}
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
                    <k.icon className="h-5 w-5" style={{ color: "#22C55E" }} />
                  </div>
                  <span className="text-xs font-medium flex items-center gap-1" style={{ color: k.up ? "#22C55E" : "#F87171" }}>
                    {k.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {k.change}
                  </span>
                </div>
                <p className="text-3xl font-bold text-white mt-3">{k.value}</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>{k.label} · {k.period}</p>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Breakdown */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}
        >
          <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="text-sm font-semibold text-white">Order Breakdown</h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Orders by status</p>
          </div>
          <div className="px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
              </div>
            ) : orderBreakdown.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "rgba(255,255,255,0.3)" }}>No order data yet.</p>
            ) : (
              <div className="space-y-3">
                {orderBreakdown.map((o) => (
                  <div
                    key={o.status}
                    className="flex items-center justify-between rounded-xl p-3"
                    style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                      <span className="text-sm font-medium text-white capitalize">{o.status}</span>
                    </div>
                    <Badge variant="outline" className="text-xs border-white/20 text-white/60">{o.count} orders</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Sellers */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}
        >
          <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="text-sm font-semibold text-white">Top Sellers</h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>By total sales volume</p>
          </div>
          <div className="px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
              </div>
            ) : topSellers.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "rgba(255,255,255,0.3)" }}>No seller data yet.</p>
            ) : (
              <div className="space-y-3">
                {topSellers.map((s, i) => (
                  <div
                    key={s.name}
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{s.name}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>⭐ {s.rating.toFixed(1)} rating</p>
                    </div>
                    <span className="text-sm font-semibold text-white shrink-0">
                      {s.totalSales} sales
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
