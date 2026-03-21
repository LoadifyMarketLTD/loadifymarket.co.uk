import { useState, useEffect, useCallback } from "react";
import { Package, Search, Filter, Eye, Ban, CheckCircle2, MoreHorizontal, Loader2 } from "lucide-react";
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
import { supabase } from "@/lib/supabase";

interface Product {
  id: string;
  title: string;
  seller: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
}

type ProductRow = {
  id: string;
  title: string | null;
  price: number | null;
  stockQuantity: number | null;
  isActive: boolean | null;
  createdAt: string | null;
  sellerId: string | null;
};

type SellerProfileRow = {
  userId: string;
  storeName?: string | null;
  businessName?: string | null;
};

type UserRow = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
};

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(""
);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Fetch products first (include sellerId)
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id,title,price,stockQuantity,isActive,createdAt,sellerId")
        .order("createdAt", { ascending: false })
        .limit(200);

      if (productsError) throw productsError;

      const productRows: ProductRow[] = (productsData || []) as ProductRow[];

      const sellerIds = Array.from(
        new Set(productRows.map((p) => p.sellerId).filter((id): id is string => Boolean(id)))
      );

      // 2) Fetch seller_profiles by userId IN sellerIds
      const sellerProfilesByUserId = new Map<string, SellerProfileRow>();
      if (sellerIds.length > 0) {
        const { data: sellerProfiles, error: sellerProfilesError } = await supabase
          .from("seller_profiles")
          .select("userId,storeName,businessName")
          .in("userId", sellerIds);

        if (sellerProfilesError) throw sellerProfilesError;

        (sellerProfiles || []).forEach((sp) => {
          const row = sp as SellerProfileRow;
          if (row?.userId) sellerProfilesByUserId.set(row.userId, row);
        });
      }

      // 3) Fetch users by id IN sellerIds
      const usersById = new Map<string, UserRow>();
      if (sellerIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id,firstName,lastName")
          .in("id", sellerIds);

        if (usersError) throw usersError;

        (usersData || []).forEach((u) => {
          const row = u as UserRow;
          if (row?.id) usersById.set(row.id, row);
        });
      }

      // 4) Map seller display name in code
      const mapped: Product[] = productRows.map((p) => {
        const sellerId = p.sellerId;
        const sellerProfile = sellerId ? sellerProfilesByUserId.get(sellerId) : undefined;
        const sellerUser = sellerId ? usersById.get(sellerId) : undefined;

        const sellerName =
          sellerProfile?.storeName ||
          sellerProfile?.businessName ||
          (sellerUser
            ? `${sellerUser.firstName ?? ""} ${sellerUser.lastName ?? ""}`.trim()
            : "—") ||
          "—";

        return {
          id: p.id,
          title: p.title ?? "—",
          seller: sellerName,
          price: p.price ?? 0,
          stockQuantity: p.stockQuantity ?? 0,
          isActive: p.isActive ?? true,
          createdAt: p.createdAt
            ? new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : "—",
        };
      });

      setProducts(mapped);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const toggleActive = async (id: string, currentActive: boolean) => {
    setActionLoading(id);
    setError(null);
    try {
      const { error } = await supabase
        .from("products")
        .update({ isActive: !currentActive })
        .eq("id", id);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, isActive: !currentActive } : p));
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update product");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.seller.toLowerCase().includes(search.toLowerCase())
  );

  const activeProducts = filtered.filter((p) => p.isActive);
  const inactiveProducts = filtered.filter((p) => !p.isActive);

  const renderTable = (data: Product[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead className="hidden sm:table-cell">Seller</TableHead>
          <TableHead>Price</TableHead>
          <TableHead className="hidden md:table-cell">Stock</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />No products found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="max-w-[250px]">
                <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.createdAt}</p>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{p.seller}</TableCell>
              <TableCell className="text-sm font-semibold text-foreground">£{p.price.toLocaleString()}</TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.stockQuantity}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    p.isActive
                      ? "bg-emerald-500/15 text-emerald-700 border-emerald-200"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {p.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading === p.id}>
                      {actionLoading === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-3.5 w-3.5 mr-2" /> View Listing
                    </DropdownMenuItem>
                    {p.isActive ? (
                      <DropdownMenuItem onClick={() => toggleActive(p.id, p.isActive)} className="text-destructive">
                        <Ban className="h-3.5 w-3.5 mr-2" /> Deactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => toggleActive(p.id, p.isActive)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Activate
                      </DropdownMenuItem>
                    )}
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
        <p className="text-muted-foreground text-sm mt-1">
          {products.length} total listings · {activeProducts.length} active · {inactiveProducts.length} inactive
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

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
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="active"><Card><CardContent className="pt-4">{renderTable(activeProducts)}</CardContent></Card></TabsContent>
        <TabsContent value="inactive"><Card><CardContent className="pt-4">{renderTable(inactiveProducts)}</CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminProducts;