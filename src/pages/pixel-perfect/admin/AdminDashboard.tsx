import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, DollarSign, Package, ShieldCheck, TrendingUp, TrendingDown,
  ArrowUpRight, AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  { label: "Total Revenue", value: "£2,456,890", change: "+12.5%", up: true, icon: DollarSign },
  { label: "Active Sellers", value: "342", change: "+8 this week", up: true, icon: Users },
  { label: "Total Products", value: "12,847", change: "+156 new", up: true, icon: Package },
  { label: "Pending Approvals", value: "18", change: "5 urgent", up: false, icon: ShieldCheck },
];

const recentSellers = [
  { id: 1, name: "TechWholesale UK", email: "info@techwholesale.co.uk", date: "2025-03-18", status: "pending" },
  { id: 2, name: "HomeGoods Direct", email: "sales@homegoods.com", date: "2025-03-17", status: "pending" },
  { id: 3, name: "SportMax Trade", email: "trade@sportmax.co.uk", date: "2025-03-17", status: "approved" },
  { id: 4, name: "LuxeBeauty Wholesale", email: "info@luxebeauty.com", date: "2025-03-16", status: "rejected" },
  { id: 5, name: "GreenPlanet Supplies", email: "hello@greenplanet.co.uk", date: "2025-03-15", status: "approved" },
];

const alerts = [
  { id: 1, message: "3 sellers awaiting document verification", type: "warning" },
  { id: 2, message: "Revenue target 92% achieved this month", type: "info" },
  { id: 3, message: "5 flagged product listings need review", type: "warning" },
  { id: 4, message: "System backup completed successfully", type: "success" },
];

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-200",
  approved: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  rejected: "bg-destructive/15 text-destructive border-destructive/20",
};

const AdminDashboard = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Platform health and key metrics at a glance.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className={`text-xs font-medium flex items-center gap-1 ${s.up ? "text-emerald-600" : "text-amber-600"}`}>
                  {s.up ? <TrendingUp className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {s.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-3">{s.value}</p>
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
              <CardTitle className="text-base">Recent Seller Applications</CardTitle>
              <CardDescription>Latest registration requests</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="text-xs" asChild>
              <Link to="/admin/approvals">
                View All <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
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
                {recentSellers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">{s.email}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{s.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor[s.status]}>
                        {s.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">System Alerts</CardTitle>
            <CardDescription>Recent notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((a) => (
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
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
