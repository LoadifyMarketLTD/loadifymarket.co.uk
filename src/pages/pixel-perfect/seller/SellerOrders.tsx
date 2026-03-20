import { ShoppingCart, Clock, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const orders = [
  { id: "ORD-1042", buyer: "RetailHub London", items: 3, total: 2450, status: "paid", date: "19 Mar 2026" },
  { id: "ORD-1041", buyer: "BargainBox Ltd", items: 1, total: 890, status: "shipped", date: "19 Mar 2026" },
  { id: "ORD-1040", buyer: "MarketStall UK", items: 5, total: 3200, status: "packed", date: "18 Mar 2026" },
  { id: "ORD-1039", buyer: "ClearanceKing", items: 2, total: 1750, status: "delivered", date: "18 Mar 2026" },
  { id: "ORD-1038", buyer: "ValueFinds Ltd", items: 1, total: 650, status: "paid", date: "17 Mar 2026" },
  { id: "ORD-1037", buyer: "QuickSell Pro", items: 4, total: 4100, status: "delivered", date: "17 Mar 2026" },
  { id: "ORD-1036", buyer: "StockDirect UK", items: 2, total: 1200, status: "cancelled", date: "16 Mar 2026" },
];

const statusColors: Record<string, string> = {
  paid: "bg-blue-500/10 text-blue-700",
  packed: "bg-amber-500/10 text-amber-700",
  shipped: "bg-purple-500/10 text-purple-700",
  delivered: "bg-emerald-500/10 text-emerald-700",
  cancelled: "bg-red-500/10 text-red-700",
  refunded: "bg-muted text-muted-foreground",
};

const SellerOrders = () => {
  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">{orders.length} orders total</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." className="pl-9 h-10" />
        </div>
        <Button variant="outline" size="default">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Order</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Buyer</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Items</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Total</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Date</th>
                <th className="text-right text-xs font-semibold text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4 text-sm font-medium text-foreground">{o.id}</td>
                  <td className="p-4 text-sm text-foreground">{o.buyer}</td>
                  <td className="p-4 text-sm text-muted-foreground">{o.items}</td>
                  <td className="p-4 text-sm font-semibold text-foreground">£{o.total.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColors[o.status]}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{o.date}</td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" className="text-xs">View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SellerOrders;
