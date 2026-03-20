import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, MapPin, TrendingUp, ArrowUpRight, Package } from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  { label: "Total Orders", value: "24", icon: ShoppingBag, desc: "3 in progress" },
  { label: "Wishlist Items", value: "12", icon: Heart, desc: "2 on sale" },
  { label: "Saved Addresses", value: "3", icon: MapPin, desc: "1 default" },
  { label: "Total Spent", value: "£18,450", icon: TrendingUp, desc: "This year" },
];

const recentOrders = [
  { id: "ORD-2847", date: "2025-03-18", items: 3, total: "£1,240.00", status: "shipped" },
  { id: "ORD-2831", date: "2025-03-15", items: 1, total: "£589.00", status: "processing" },
  { id: "ORD-2819", date: "2025-03-12", items: 5, total: "£3,120.00", status: "delivered" },
  { id: "ORD-2804", date: "2025-03-08", items: 2, total: "£845.00", status: "delivered" },
];

const wishlistPreview = [
  { name: "iPhone 15 Pro Max — 50 Units", price: "£32,500", image: "📱" },
  { name: "Sony WH-1000XM5 — 100 Units", price: "£18,900", image: "🎧" },
  { name: "Samsung 65\" QLED TV — 20 Units", price: "£12,400", image: "📺" },
];

const statusColor: Record<string, string> = {
  processing: "bg-amber-500/15 text-amber-700 border-amber-200",
  shipped: "bg-blue-500/15 text-blue-700 border-blue-200",
  delivered: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
};

const BuyerDashboard = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, Jane 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's a summary of your account activity.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xs text-primary">{s.desc}</p>
              </div>
            </CardContent>
          </Card>
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
              <Link to="/dashboard/orders">
                View All <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{o.id}</p>
                    <p className="text-xs text-muted-foreground">{o.date} · {o.items} item{o.items > 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">{o.total}</span>
                  <Badge variant="outline" className={statusColor[o.status]}>{o.status}</Badge>
                </div>
              </div>
            ))}
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
              <Link to="/dashboard/wishlist">
                View All <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {wishlistPreview.map((item) => (
              <div key={item.name} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <span className="text-2xl">{item.image}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-primary font-semibold">{item.price}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BuyerDashboard;
