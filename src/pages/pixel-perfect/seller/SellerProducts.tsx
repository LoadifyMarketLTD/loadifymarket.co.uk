import { Package, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const products = [
  { id: 1, name: "Samsung Galaxy & iPhone Mixed Lot", category: "Electronics", price: 2450, stock: 12, status: "active", views: 342 },
  { id: 2, name: "Designer Clothing Bundle", category: "Clothing", price: 1800, stock: 5, status: "active", views: 218 },
  { id: 3, name: "Skincare & Fragrance Bundle", category: "Health & Beauty", price: 890, stock: 0, status: "out_of_stock", views: 412 },
  { id: 4, name: "DeWalt Power Tools End of Line", category: "Tools & DIY", price: 1750, stock: 8, status: "active", views: 198 },
  { id: 5, name: "Mixed Amazon Returns x5 Lots", category: "Mixed Lots", price: 3200, stock: 2, status: "low_stock", views: 534 },
  { id: 6, name: "Gym Equipment Clearance", category: "Sports", price: 980, stock: 15, status: "active", views: 145 },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-700" },
  out_of_stock: { label: "Out of Stock", className: "bg-red-500/10 text-red-700" },
  low_stock: { label: "Low Stock", className: "bg-amber-500/10 text-amber-700" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
};

const SellerProducts = () => {
  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} products listed</p>
        </div>
        <Button size="sm" className="bg-gradient-hero text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-9 h-10" />
        </div>
        <Button variant="outline" size="default">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Product</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Category</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Price</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Stock</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Views</th>
                <th className="text-right text-xs font-semibold text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => {
                const s = statusConfig[p.status];
                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium text-foreground line-clamp-1">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{p.category}</td>
                    <td className="p-4 text-sm font-semibold text-foreground">£{p.price.toLocaleString()}</td>
                    <td className="p-4 text-sm text-foreground">{p.stock}</td>
                    <td className="p-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.className}`}>{s.label}</span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{p.views}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SellerProducts;
