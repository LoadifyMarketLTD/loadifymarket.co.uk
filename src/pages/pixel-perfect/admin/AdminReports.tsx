import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, TrendingDown, PoundSterling, Users, Package,
  ShoppingCart, Download, Calendar,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const kpis = [
  { label: "Total Revenue", value: "£2,456,890", change: "+12.5%", up: true, icon: PoundSterling, period: "This month" },
  { label: "New Users", value: "284", change: "+18.2%", up: true, icon: Users, period: "This month" },
  { label: "Products Listed", value: "12,847", change: "+3.8%", up: true, icon: Package, period: "Total active" },
  { label: "Orders Completed", value: "1,342", change: "-2.1%", up: false, icon: ShoppingCart, period: "This month" },
];

const topSellers = [
  { name: "TechWholesale UK", revenue: "£245,000", orders: 486, rating: 4.8 },
  { name: "QuickSell Pro", revenue: "£178,500", orders: 342, rating: 4.6 },
  { name: "SportMax Trade", revenue: "£134,200", orders: 218, rating: 4.7 },
  { name: "HomeGoods Direct", revenue: "£98,400", orders: 156, rating: 4.4 },
  { name: "ToolKing UK", revenue: "£87,600", orders: 142, rating: 4.5 },
];

const topCategories = [
  { name: "Electronics", revenue: "£892,000", products: 3240, share: "36%" },
  { name: "Clothing", revenue: "£456,000", products: 2180, share: "19%" },
  { name: "Mixed Lots", revenue: "£312,000", products: 1560, share: "13%" },
  { name: "Tools & DIY", revenue: "£245,000", products: 980, share: "10%" },
  { name: "Health & Beauty", revenue: "£198,000", products: 870, share: "8%" },
];

const monthlyRevenue = [
  { month: "Oct 2025", revenue: "£1,890,000", orders: 982 },
  { month: "Nov 2025", revenue: "£2,120,000", orders: 1102 },
  { month: "Dec 2025", revenue: "£2,840,000", orders: 1480 },
  { month: "Jan 2026", revenue: "£1,960,000", orders: 1020 },
  { month: "Feb 2026", revenue: "£2,180,000", orders: 1184 },
  { month: "Mar 2026", revenue: "£2,456,890", orders: 1342 },
];

const AdminReports = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform performance overview and insights.</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="30d">
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="default"><Download className="mr-2 h-4 w-4" /> Export</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
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
        {/* Monthly Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue</CardTitle>
            <CardDescription>Revenue and order trends over 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyRevenue.map((m) => (
                <div key={m.month} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{m.month}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-foreground">{m.revenue}</span>
                    <Badge variant="secondary" className="text-xs">{m.orders} orders</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Sellers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Sellers</CardTitle>
            <CardDescription>By revenue this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSellers.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.orders} orders · ⭐ {s.rating}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">{s.revenue}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Categories</CardTitle>
          <CardDescription>Revenue by product category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {topCategories.map((c) => (
              <div key={c.name} className="rounded-lg border border-border p-4 text-center space-y-1">
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-lg font-bold text-foreground">{c.revenue}</p>
                <p className="text-xs text-muted-foreground">{c.products} products · {c.share} share</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReports;
