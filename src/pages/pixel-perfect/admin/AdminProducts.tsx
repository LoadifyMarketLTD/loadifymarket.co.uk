import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Search, Eye, Ban, CheckCircle2, MoreHorizontal, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  isApproved: boolean;
  createdAt: string;
}

type ProductRow = {
  id: string;
  title: string | null;
  price: number | null;
  stockQuantity: number | null;
  isActive: boolean | null;
  isApproved: boolean | null;
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
  const navigate = useNavigate();
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
        .select("id,title,price,stockQuantity,isActive,isApproved,createdAt,sellerId")
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
          isApproved: p.isApproved ?? false,
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

  const toggleApprove = async (id: string, currentApproved: boolean) => {
    setActionLoading(id);
    setError(null);
    try {
      const { error } = await supabase
        .from("products")
        .update({ isApproved: !currentApproved })
        .eq("id", id);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, isApproved: !currentApproved } : p));
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update approval status");
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
        <TableRow style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Product</TableHead>
          <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Seller</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Price</TableHead>
          <TableHead className="hidden md:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Stock</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Published</TableHead>
          <TableHead className="hidden lg:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Approved</TableHead>
          <TableHead className="text-right text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: "rgba(100,116,139,0.65)" }} />
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8" style={{ color: "rgba(100,116,139,0.65)" }}>
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />No products found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((p) => (
            <TableRow
              key={p.id}
              className="cursor-pointer hover:bg-white/5 transition-colors"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              onClick={(e) => {
                const target = e.target instanceof Element ? e.target : null;
                if (!target || target.closest("button,[role=menuitem]")) return;
                navigate(`/product/${p.id}`);
              }}
            >
              <TableCell className="max-w-[250px]">
                <p className="text-sm font-medium text-white truncate">{p.title}</p>
                <p className="text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>{p.createdAt}</p>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>{p.seller}</TableCell>
              <TableCell className="text-sm font-semibold text-white">£{p.price.toLocaleString()}</TableCell>
              <TableCell className="hidden md:table-cell text-sm" style={{ color: "rgba(148,163,184,0.85)" }}>{p.stockQuantity}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    p.isActive
                      ? "border-emerald-500/30 text-success bg-success/10"
                      : "border-slate-200 text-slate-400"
                  }
                >
                  {p.isActive ? "Published" : "Unpublished"}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Badge
                  variant="outline"
                  className={
                    p.isApproved
                      ? "border-emerald-500/30 text-success bg-success/10"
                      : "border-primary/40 text-primary bg-primary/10"
                  }
                >
                  {p.isApproved ? "Approved" : "Pending"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" disabled={actionLoading === p.id}>
                      {actionLoading === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/product/${p.id}`)}>
                      <Eye className="h-3.5 w-3.5 mr-2" /> View Listing
                    </DropdownMenuItem>
                    {p.isApproved ? (
                      <DropdownMenuItem onClick={() => toggleApprove(p.id, p.isApproved)} className="text-primary">
                        <ShieldX className="h-3.5 w-3.5 mr-2" /> Revoke Approval
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => toggleApprove(p.id, p.isApproved)} className="text-emerald-500">
                        <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Approve
                      </DropdownMenuItem>
                    )}
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
    <div className="p-4 sm:p-6 space-y-6" style={{ background: "transparent", minHeight: "100%" }}>
      <div className="pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <h1 className="text-2xl font-bold text-white tracking-tight">Product Moderation</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.85)" }}>
          {products.length} total listings · {activeProducts.length} published · {inactiveProducts.length} unpublished · {products.filter(p => !p.isApproved).length} pending approval
        </p>
      </div>

      {error && (
        <div className="rounded-xl border p-4 text-sm" style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171" }}>
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(100,116,139,0.65)" }} />
          <Input
            placeholder="Search products or sellers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
          style={{ border: "1px solid rgba(255,255,255,0.05)", color: "#ffffff" }}
          />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <TabsTrigger value="all" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">All <Badge variant="outline" className="ml-2 text-xs border-white/20 text-slate-500">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">Published</TabsTrigger>
          <TabsTrigger value="inactive" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">Unpublished</TabsTrigger>
        </TabsList>
        {(["all", "active", "inactive"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>
              <div className="px-2 py-2 overflow-x-auto">
                {renderTable(tab === "all" ? filtered : tab === "active" ? activeProducts : inactiveProducts)}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AdminProducts;