import { useState } from "react";
import { Package, Search, Filter, Eye, Ban, CheckCircle2, MoreHorizontal, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Product {
  id: number;
  title: string;
  seller: string;
  category: string;
  price: number;
  status: "active" | "pending_review" | "flagged" | "removed";
  listed: string;
  views: number;
  orders: number;
}

const products: Product[] = [
  { id: 1, title: "Samsung Galaxy & iPhone Mixed Lot — 50 Units", seller: "TechWholesale UK", category: "Electronics", price: 2450, status: "active", listed: "12 Mar 2026", views: 342, orders: 18 },
  { id: 2, title: "Designer Clothing Bundle — Mixed Brands", seller: "TechWholesale UK", category: "Clothing", price: 1800, status: "active", listed: "10 Mar 2026", views: 218, orders: 12 },
  { id: 3, title: "Counterfeit Nike Trainers (Reported)", seller: "ShadyDeals Ltd", category: "Clothing", price: 500, status: "flagged", listed: "15 Mar 2026", views: 89, orders: 0 },
  { id: 4, title: "DeWalt Power Tools End of Line", seller: "ToolKing UK", category: "Tools", price: 1750, status: "active", listed: "8 Mar 2026", views: 198, orders: 8 },
  { id: 5, title: "Mixed Amazon Returns x5 Lots", seller: "QuickSell Pro", category: "Mixed Lots", price: 3200, status: "pending_review", listed: "18 Mar 2026", views: 12, orders: 0 },
  { id: 6, title: "Expired Supplements Bundle", seller: "HealthPlus Trade", category: "Health", price: 350, status: "removed", listed: "5 Mar 2026", views: 45, orders: 2 },
  { id: 7, title: "Gym Equipment Clearance", seller: "SportMax Trade", category: "Sports", price: 980, status: "active", listed: "6 Mar 2026", views: 145, orders: 6 },
  { id: 8, title: "Baby Clothing Pallet — New with Tags", seller: "HomeGoods Direct", category: "Baby", price: 1200, status: "pending_review", listed: "19 Mar 2026", views: 5, orders: 0 },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-500/15 text-emerald-700 border-emerald-200" },
  pending_review: { label: "Pending Review", className: "bg-amber-500/15 text-amber-700 border-amber-200" },
  flagged: { label: "Flagged", className: "bg-red-500/15 text-red-700 border-red-200" },
  removed: { label: "Removed", className: "bg-muted text-muted-foreground" },
};

const AdminProducts = () => {
  const [search, setSearch] = useState("");

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.seller.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((p) => p.status === status);

  const renderTable = (data: Product[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead className="hidden sm:table-cell">Seller</TableHead>
          <TableHead className="hidden md:table-cell">Category</TableHead>
          <TableHead>Price</TableHead>
          <TableHead className="hidden lg:table-cell">Views</TableHead>
          <TableHead className="hidden lg:table-cell">Orders</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />No products found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="max-w-[250px]">
                <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.listed}</p>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{p.seller}</TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{p.category}</TableCell>
              <TableCell className="text-sm font-semibold text-foreground">£{p.price.toLocaleString()}</TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{p.views}</TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{p.orders}</TableCell>
              <TableCell><Badge variant="outline" className={statusConfig[p.status].className}>{statusConfig[p.status].label}</Badge></TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Eye className="h-3.5 w-3.5 mr-2" /> View Listing</DropdownMenuItem>
                    <DropdownMenuItem><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve</DropdownMenuItem>
                    <DropdownMenuItem><AlertTriangle className="h-3.5 w-3.5 mr-2" /> Flag</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive"><Ban className="h-3.5 w-3.5 mr-2" /> Remove</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
        <h1 className="text-2xl font-bold text-foreground">Product Moderation</h1>
        <p className="text-muted-foreground text-sm mt-1">{products.length} total listings · {byStatus("pending_review").length} pending review · {byStatus("flagged").length} flagged</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products or sellers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Button variant="outline" size="default"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="pending_review">Pending</TabsTrigger>
          <TabsTrigger value="flagged">Flagged</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="pending_review"><Card><CardContent className="pt-4">{renderTable(byStatus("pending_review"))}</CardContent></Card></TabsContent>
        <TabsContent value="flagged"><Card><CardContent className="pt-4">{renderTable(byStatus("flagged"))}</CardContent></Card></TabsContent>
        <TabsContent value="active"><Card><CardContent className="pt-4">{renderTable(byStatus("active"))}</CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminProducts;
