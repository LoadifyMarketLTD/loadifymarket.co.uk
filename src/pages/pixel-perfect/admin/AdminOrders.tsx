import { useState } from "react";
import { ShoppingCart, Search, Filter, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface Order {
  id: string;
  buyer: string;
  seller: string;
  items: number;
  total: number;
  status: "paid" | "packed" | "shipped" | "delivered" | "cancelled" | "refunded" | "disputed";
  date: string;
  paymentMethod: string;
}

const orders: Order[] = [
  { id: "ORD-3042", buyer: "Jane Buyer", seller: "TechWholesale UK", items: 3, total: 2450, status: "paid", date: "19 Mar 2026", paymentMethod: "Visa •••• 4821" },
  { id: "ORD-3041", buyer: "Mark Thompson", seller: "TechWholesale UK", items: 1, total: 890, status: "shipped", date: "19 Mar 2026", paymentMethod: "Mastercard •••• 7193" },
  { id: "ORD-3040", buyer: "David Chen", seller: "SportMax Trade", items: 5, total: 3200, status: "packed", date: "18 Mar 2026", paymentMethod: "Visa •••• 9012" },
  { id: "ORD-3039", buyer: "Jane Buyer", seller: "QuickSell Pro", items: 2, total: 1750, status: "delivered", date: "18 Mar 2026", paymentMethod: "Visa •••• 4821" },
  { id: "ORD-3038", buyer: "Lisa Brown", seller: "ToolKing UK", items: 1, total: 650, status: "disputed", date: "17 Mar 2026", paymentMethod: "Amex •••• 3042" },
  { id: "ORD-3037", buyer: "Mark Thompson", seller: "HomeGoods Direct", items: 4, total: 4100, status: "delivered", date: "17 Mar 2026", paymentMethod: "Mastercard •••• 7193" },
  { id: "ORD-3036", buyer: "David Chen", seller: "TechWholesale UK", items: 2, total: 1200, status: "cancelled", date: "16 Mar 2026", paymentMethod: "Visa •••• 9012" },
  { id: "ORD-3035", buyer: "Jane Buyer", seller: "SportMax Trade", items: 1, total: 980, status: "refunded", date: "15 Mar 2026", paymentMethod: "Visa •••• 4821" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-blue-500/15 text-blue-700 border-blue-200" },
  packed: { label: "Packed", className: "bg-amber-500/15 text-amber-700 border-amber-200" },
  shipped: { label: "Shipped", className: "bg-purple-500/15 text-purple-700 border-purple-200" },
  delivered: { label: "Delivered", className: "bg-emerald-500/15 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
  refunded: { label: "Refunded", className: "bg-muted text-muted-foreground" },
  disputed: { label: "Disputed", className: "bg-red-500/15 text-red-700 border-red-200" },
};

const AdminOrders = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);

  const filtered = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.buyer.toLowerCase().includes(search.toLowerCase()) ||
      o.seller.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((o) => o.status === status);
  const activeOrders = filtered.filter((o) => !["cancelled", "refunded"].includes(o.status));

  const renderTable = (data: Order[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Buyer</TableHead>
          <TableHead className="hidden sm:table-cell">Seller</TableHead>
          <TableHead className="hidden md:table-cell">Items</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Date</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />No orders found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium text-sm">{o.id}</TableCell>
              <TableCell className="text-sm">{o.buyer}</TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{o.seller}</TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{o.items}</TableCell>
              <TableCell className="text-sm font-semibold text-foreground">£{o.total.toLocaleString()}</TableCell>
              <TableCell><Badge variant="outline" className={statusConfig[o.status].className}>{statusConfig[o.status].label}</Badge></TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{o.date}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(o)}><Eye className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
        <p className="text-muted-foreground text-sm mt-1">{orders.length} total orders · {byStatus("disputed").length} disputed</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", count: orders.length, value: `£${orders.reduce((s, o) => s + o.total, 0).toLocaleString()}` },
          { label: "Active", count: activeOrders.length, value: "In progress" },
          { label: "Delivered", count: byStatus("delivered").length, value: "Completed" },
          { label: "Disputed", count: byStatus("disputed").length, value: "Needs attention" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 space-y-1">
            <div className="font-display text-2xl font-bold text-foreground">{stat.count}</div>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-xs text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Button variant="outline" size="default"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
          <TabsTrigger value="disputed">Disputed</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="active"><Card><CardContent className="pt-4">{renderTable(activeOrders.filter((o) => o.status !== "delivered"))}</CardContent></Card></TabsContent>
        <TabsContent value="delivered"><Card><CardContent className="pt-4">{renderTable(byStatus("delivered"))}</CardContent></Card></TabsContent>
        <TabsContent value="disputed"><Card><CardContent className="pt-4">{renderTable(byStatus("disputed"))}</CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.id}</DialogTitle>
              <DialogDescription>Order details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Buyer</span><p className="font-medium text-foreground">{selected.buyer}</p></div>
                <div><span className="text-muted-foreground">Seller</span><p className="font-medium text-foreground">{selected.seller}</p></div>
                <div><span className="text-muted-foreground">Items</span><p className="font-medium text-foreground">{selected.items}</p></div>
                <div><span className="text-muted-foreground">Total</span><p className="font-semibold text-foreground">£{selected.total.toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">Payment</span><p className="font-medium text-foreground">{selected.paymentMethod}</p></div>
                <div><span className="text-muted-foreground">Date</span><p className="font-medium text-foreground">{selected.date}</p></div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminOrders;
