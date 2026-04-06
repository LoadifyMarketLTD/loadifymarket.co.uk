import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, Package, ShieldCheck, TrendingUp,
  ArrowUpRight, AlertTriangle, Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface RecentSeller {
  id: string;
  name: string;
  email: string;
  date: string;
  status: string;
}

interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  pendingSellers: number;
}

const DEFAULT_STATUS_COLOR = "border-white/10 text-slate-400";

const statusColor: Record<string, string> = {
  active:    "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  submitted: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  draft:     DEFAULT_STATUS_COLOR,
  suspended: "border-red-500/30 text-red-400 bg-red-500/10",
};

const statusLabel: Record<string, string> = {
  active:    "Active",
  submitted: "Setup in progress",
  draft:     "Setup required",
  suspended: "Suspended",
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    pendingSellers: 0,
  });
  const [recentSellers, setRecentSellers] = useState<RecentSeller[]>([]);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [usersRes, productsRes, ordersRes, pendingSellersRes, recentSellersRes, reportsRes] =
          await Promise.all([
            supabase.from("users").select("id", { count: "exact", head: true }),
            supabase.from("products").select("id", { count: "exact", head: true }),
            supabase.from("orders").select("id", { count: "exact", head: true }),
            supabase
              .from("seller_profiles")
              .select("userId", { count: "exact", head: true })
              .in("sellerStatus", ["draft", "submitted"]),
            supabase
              .from("users")
              .select("id, email, firstName, lastName, createdAt, seller_profiles(sellerStatus, storeName, businessName)")
              .eq("role", "seller")
              .order("createdAt", { ascending: false })
              .limit(5),
            supabase
              .from("reported_listings")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending"),
          ]);

        setStats({
          totalUsers: usersRes.count ?? 0,
          totalProducts: productsRes.count ?? 0,
          totalOrders: ordersRes.count ?? 0,
          pendingSellers: pendingSellersRes.count ?? 0,
        });

        setPendingReportsCount(reportsRes.count ?? 0);

        const sellers: RecentSeller[] = (recentSellersRes.data || []).map((u) => {
          const profile = Array.isArray(u.seller_profiles) ? u.seller_profiles[0] : u.seller_profiles;
          const name = profile?.storeName || profile?.businessName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email;
          const status = profile?.sellerStatus ?? "draft";
          return {
            id: u.id,
            name,
            email: u.email,
            date: u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "—",
            status,
          };
        });
        setRecentSellers(sellers);
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statsCards = [
    { label: "Total Users", value: stats.totalUsers.toLocaleString(), change: "Registered", up: true, icon: Users },
    { label: "Total Products", value: stats.totalProducts.toLocaleString(), change: "Listed", up: true, icon: Package },
    { label: "Total Orders", value: stats.totalOrders.toLocaleString(), change: "All time", up: true, icon: ShieldCheck },
    { label: "Setup Incomplete", value: stats.pendingSellers.toString(), change: "Sellers in progress", up: false, icon: ShieldCheck },
  ];

  const alerts = [
    ...(stats.pendingSellers > 0
      ? [{ id: "incomplete-sellers", message: `${stats.pendingSellers} seller${stats.pendingSellers !== 1 ? "s" : ""} still setting up their account`, type: "warning" }]
      : []),
    ...(pendingReportsCount > 0
      ? [{ id: "pending-reports", message: `${pendingReportsCount} flagged listing${pendingReportsCount !== 1 ? "s" : ""} need review`, type: "warning" }]
      : []),
    ...(stats.pendingSellers === 0 && pendingReportsCount === 0
      ? [{ id: "all-clear", message: "No pending actions — platform is running smoothly", type: "success" }]
      : []),
  ];

  return (
    <div className="p-6 space-y-7" style={{ background: "#0A0B1A", minHeight: "100%" }}>
      <div className="pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h1 className="text-2xl font-bold text-white tracking-tight">Admin Overview</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          Platform health and key metrics at a glance.
        </p>
      </div>

      {error && (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171" }}
        >
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((s, i) => {
          const isGreen = s.up;
          const iconColors = ["#22C55E", "#7C3AED", "#22C55E", "#F59E0B"];
          const iconBgColors = ["rgba(34,197,94,0.12)", "rgba(124,58,237,0.12)", "rgba(34,197,94,0.12)", "rgba(245,158,11,0.12)"];
          return (
            <div
              key={s.label}
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: iconBgColors[i] }}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: iconColors[i] }} />
                  ) : (
                    <s.icon className="h-5 w-5" style={{ color: iconColors[i] }} />
                  )}
                </div>
                <span
                  className="text-xs font-medium flex items-center gap-1"
                  style={{ color: isGreen ? "#22C55E" : "#F59E0B" }}
                >
                  {isGreen
                    ? <TrendingUp className="h-3 w-3" />
                    : <AlertTriangle className="h-3 w-3" />}
                  {s.change}
                </span>
              </div>
              <p className="text-3xl font-bold text-white">
                {loading ? "—" : s.value}
              </p>
              <p className="text-xs mt-1.5 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                {s.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Seller Applications */}
        <div
          className="lg:col-span-2 rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div>
              <h2 className="text-sm font-semibold text-white">Recent Seller Registrations</h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Latest seller accounts</p>
            </div>
            <Button
              size="sm"
              className="text-xs font-medium transition-all"
              style={{
                background: "rgba(124,58,237,0.15)",
                color: "#a78bfa",
                border: "1px solid rgba(124,58,237,0.3)",
              }}
              asChild
            >
              <Link to="/admin/approvals">
                View All <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Business Name</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Email</TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Date</TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSellers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8" style={{ color: "rgba(255,255,255,0.3)" }}>
                        No seller applications yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentSellers.map((s) => (
                      <TableRow key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <TableCell className="font-medium text-white py-3">{s.name}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs py-3" style={{ color: "rgba(255,255,255,0.45)" }}>{s.email}</TableCell>
                        <TableCell className="text-xs py-3" style={{ color: "rgba(255,255,255,0.45)" }}>{s.date}</TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium ${statusColor[s.status] ?? DEFAULT_STATUS_COLOR}`}
                          >
                            {statusLabel[s.status] ?? s.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* System Alerts */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div
            className="px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <h2 className="text-sm font-semibold text-white">System Alerts</h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Recent notifications</p>
          </div>
          <div className="px-6 py-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
              </div>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl p-3.5 text-sm"
                  style={
                    a.type === "warning"
                      ? { border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)", color: "#FBD760" }
                      : a.type === "success"
                      ? { border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)", color: "#4ade80" }
                      : { border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }
                  }
                >
                  {a.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
