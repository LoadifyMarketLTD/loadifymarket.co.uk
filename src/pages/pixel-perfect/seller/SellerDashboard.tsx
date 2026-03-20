import {
  Package, ShoppingCart, PoundSterling, TrendingUp, ArrowUpRight,
  ArrowDownRight, Eye, Users, Star, Truck, Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const stats = [
  {
    label: "Total Revenue",
    value: "£24,580",
    change: "+12.5%",
    trend: "up" as const,
    icon: PoundSterling,
    description: "vs last month",
  },
  {
    label: "Active Orders",
    value: "38",
    change: "+8",
    trend: "up" as const,
    icon: ShoppingCart,
    description: "this week",
  },
  {
    label: "Products Listed",
    value: "124",
    change: "+5",
    trend: "up" as const,
    icon: Package,
    description: "total active",
  },
  {
    label: "Conversion Rate",
    value: "4.2%",
    change: "-0.3%",
    trend: "down" as const,
    icon: TrendingUp,
    description: "vs last month",
  },
];

const recentOrders = [
  { id: "ORD-1042", buyer: "RetailHub London", items: 3, total: 2450, status: "paid", time: "12 min ago" },
  { id: "ORD-1041", buyer: "BargainBox Ltd", items: 1, total: 890, status: "shipped", time: "2 hours ago" },
  { id: "ORD-1040", buyer: "MarketStall UK", items: 5, total: 3200, status: "packed", time: "5 hours ago" },
  { id: "ORD-1039", buyer: "ClearanceKing", items: 2, total: 1750, status: "delivered", time: "1 day ago" },
  { id: "ORD-1038", buyer: "ValueFinds Ltd", items: 1, total: 650, status: "paid", time: "1 day ago" },
];

const topProducts = [
  { name: "Samsung Galaxy Mixed Lot", views: 342, orders: 18, revenue: "£8,200" },
  { name: "Designer Clothing Bundle", views: 218, orders: 12, revenue: "£5,400" },
  { name: "Skincare & Fragrance Bundle", views: 412, orders: 22, revenue: "£4,890" },
  { name: "DeWalt Power Tools", views: 198, orders: 8, revenue: "£3,500" },
];

const statusColors: Record<string, string> = {
  paid: "bg-blue-500/10 text-blue-700 border-blue-200",
  packed: "bg-amber-500/10 text-amber-700 border-amber-200",
  shipped: "bg-purple-500/10 text-purple-700 border-purple-200",
  delivered: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
};

const SellerDashboard = () => {
  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, John. Here's what's happening today.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Download Report</Button>
          <Button size="sm" className="bg-gradient-hero text-primary-foreground">
            <Package className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 space-y-3 hover:shadow-card transition-shadow">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-medium ${stat.trend === "up" ? "text-emerald-600" : "text-destructive"}`}>
                {stat.trend === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {stat.change}
              </div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label} · {stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column section */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Recent Orders */}
        <div className="bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-display text-base font-semibold text-foreground">Recent Orders</h2>
            <Button variant="ghost" size="sm" className="text-xs text-primary">View All</Button>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{order.id}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.buyer} · {order.items} items
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-foreground">£{order.total.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3" /> {order.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Top Products */}
          <div className="bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display text-base font-semibold text-foreground">Top Products</h2>
              <Button variant="ghost" size="sm" className="text-xs text-primary">View All</Button>
            </div>
            <div className="divide-y divide-border">
              {topProducts.map((prod, i) => (
                <div key={prod.name} className="flex items-center gap-3 p-4">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{prod.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {prod.views}</span>
                      <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> {prod.orders}</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">{prod.revenue}</span>
                </div>
              ))}
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
                <span className="text-sm font-semibold text-foreground">4.8 / 5.0</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" /> Total Customers
                </div>
                <span className="text-sm font-semibold text-foreground">186</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4 text-primary" /> Pending Shipments
                </div>
                <span className="text-sm font-semibold text-foreground">7</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4 text-primary" /> Low Stock Items
                </div>
                <span className="text-sm font-semibold text-destructive">3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
