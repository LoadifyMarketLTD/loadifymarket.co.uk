import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Package, Eye } from "lucide-react";

const orders = [
  { id: "ORD-2847", date: "2025-03-18", items: "iPhone 15 Pro Max (x50)", total: "£32,500.00", status: "shipped", tracking: "RM9281736GB" },
  { id: "ORD-2831", date: "2025-03-15", items: "Sony WH-1000XM5 (x100)", total: "£18,900.00", status: "processing", tracking: "—" },
  { id: "ORD-2819", date: "2025-03-12", items: "Mixed Electronics Pallet", total: "£3,120.00", status: "delivered", tracking: "RM8172634GB" },
  { id: "ORD-2804", date: "2025-03-08", items: "Samsung 65\" QLED (x20)", total: "£12,400.00", status: "delivered", tracking: "RM7263541GB" },
  { id: "ORD-2791", date: "2025-03-05", items: "Apple AirPods Pro (x200)", total: "£28,000.00", status: "delivered", tracking: "RM6354128GB" },
  { id: "ORD-2778", date: "2025-03-01", items: "Dyson V15 Detect (x30)", total: "£14,700.00", status: "cancelled", tracking: "—" },
  { id: "ORD-2765", date: "2025-02-25", items: "Gaming Accessories Pallet", total: "£4,850.00", status: "delivered", tracking: "RM5241637GB" },
];

const statusColor: Record<string, string> = {
  processing: "bg-amber-500/15 text-amber-700 border-amber-200",
  shipped: "bg-blue-500/15 text-blue-700 border-blue-200",
  delivered: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
};

const BuyerOrders = () => {
  const [search, setSearch] = useState("");

  const filtered = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.items.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((o) => o.status === status);

  const renderTable = (data: typeof orders) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead className="hidden sm:table-cell">Items</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Tracking</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No orders found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium text-sm">{o.id}</TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{o.items}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{o.date}</TableCell>
              <TableCell className="font-semibold text-sm">{o.total}</TableCell>
              <TableCell className="text-xs text-muted-foreground font-mono">{o.tracking}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor[o.status]}>{o.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Eye className="h-4 w-4" />
                </Button>
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
        <h1 className="text-2xl font-bold text-foreground">My Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">Track and manage your purchases.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by order ID or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>

        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="processing"><Card><CardContent className="pt-4">{renderTable(byStatus("processing"))}</CardContent></Card></TabsContent>
        <TabsContent value="shipped"><Card><CardContent className="pt-4">{renderTable(byStatus("shipped"))}</CardContent></Card></TabsContent>
        <TabsContent value="delivered"><Card><CardContent className="pt-4">{renderTable(byStatus("delivered"))}</CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
};

export default BuyerOrders;
