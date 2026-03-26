import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

const DEFAULT_STATUS_COLOR = "bg-muted text-muted-foreground border-border";

const statusColor: Record<string, string> = {
  active:    "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  submitted: "bg-amber-500/15 text-amber-700 border-amber-200",
  pending:   "bg-amber-500/15 text-amber-700 border-amber-200",
  draft:     DEFAULT_STATUS_COLOR,
  suspended: "bg-red-500/15 text-red-700 border-red-200",
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
              .in("sellerStatus", ["draft", "submitted", "pending"]),
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Platform health and key metrics at a glance.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  {loading ? (
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                  ) : (
                    <s.icon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <span className={`text-xs font-medium flex items-center gap-1 ${s.up ? "text-emerald-600" : "text-amber-600"}`}>
                  {s.up ? <TrendingUp className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {s.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-3">
                {loading ? "—" : s.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Seller Applications */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Recent Seller Registrations</CardTitle>
              <CardDescription>Latest seller accounts</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="text-xs" asChild>
              <Link to="/admin/approvals">
                View All <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSellers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No seller applications yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentSellers.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">{s.email}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{s.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColor[s.status] ?? DEFAULT_STATUS_COLOR}>
                            {s.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">System Alerts</CardTitle>
            <CardDescription>Recent notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.id}
                  className={`rounded-lg border p-3 text-sm ${
                    a.type === "warning"
                      ? "border-amber-200 bg-amber-500/5 text-amber-700"
                      : a.type === "success"
                      ? "border-emerald-200 bg-emerald-500/5 text-emerald-700"
                      : "border-border bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {a.message}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
