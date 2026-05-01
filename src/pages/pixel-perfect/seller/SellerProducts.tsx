import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Share2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { copyToClipboard } from "@/lib/clipboard";

/** Branded Loadify Market "LM" placeholder shown when a product has no image. */
function LMPlaceholder({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ borderRadius: '8px', display: 'block', flexShrink: 0 }}
    >
      <rect width="48" height="48" rx="8" fill="#12121A" />
      <rect width="48" height="48" rx="8" fill="none" stroke="rgba(245,185,66,0.18)" strokeWidth="1" />
      {/* Stylised "L" */}
      <text
        x="10"
        y="33"
        fontFamily="'Arial Black','Impact',sans-serif"
        fontSize="22"
        fontWeight="900"
        fill="#F5B942"
        opacity="0.85"
      >L</text>
      {/* Stylised "M" */}
      <text
        x="24"
        y="33"
        fontFamily="'Arial Black','Impact',sans-serif"
        fontSize="22"
        fontWeight="900"
        fill="#F5B942"
        opacity="0.55"
      >M</text>
    </svg>
  );
}

interface ProductImage {
  url: string;
  position: number;
}

interface Product {
  id: string;
  title: string;
  categoryId: string;
  price: number;
  stockQuantity: number;
  stockStatus: string;
  isActive: boolean;
  isApproved: boolean;
  views: number;
  images?: ProductImage[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-700" },
  pending_review: { label: "Pending Review", className: "bg-amber-500/10 text-amber-700" },
  out_of_stock: { label: "Out of Stock", className: "bg-red-500/10 text-red-700" },
  low_stock: { label: "Low Stock", className: "bg-amber-500/10 text-amber-700" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
};

function deriveStatus(p: Product): string {
  if (!p.isActive) return "draft";
  if (!p.isApproved) return "pending_review";
  if (p.stockQuantity === 0) return "out_of_stock";
  if (p.stockQuantity <= 5) return "low_stock";
  return "active";
}

/** Returns the URL of the lowest-position image, or null when there are none. */
function getProductThumbnail(p: Product): string | null {
  if (!p.images || p.images.length === 0) return null;
  return p.images.slice().sort((a, b) => a.position - b.position)[0].url;
}

const BASE_URL = "https://loadifymarket.co.uk";

function facebookShareUrl(productId: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${BASE_URL}/product/${productId}`)}`;
}

function facebookDebugUrl(productId: string) {
  return `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(`${BASE_URL}/product/${productId}`)}`;
}

const SellerProducts = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, title, categoryId, price, stockQuantity, stockStatus, isActive, isApproved, views, images(url, position)")
          .eq("sellerId", user.id)
          .order("createdAt", { ascending: false });
        if (error) throw error;
        setProducts(data ?? []);
      } catch (err) {
        console.error("Error fetching products:", err);
        toast({ title: "Could not load products", description: "Please try refreshing the page.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const shareOnFacebook = (productId: string, status: string) => {
    if (status === "pending_review" || status === "draft") {
      toast({
        title: "Preview may not be visible",
        description: "Facebook previews only show for active, approved products. Your link will still be shared.",
      });
    }
    window.open(facebookShareUrl(productId), "_blank", "noopener,noreferrer");
  };

  const copyForInstagram = async (productId: string) => {
    try {
      await copyToClipboard(`${BASE_URL}/product/${productId}`);
      toast({
        title: "Link copied for Instagram",
        description: "Open Instagram, create a post or story, and paste the link in your caption.",
      });
    } catch {
      toast({ title: "Could not copy link", description: "Please copy the URL manually.", variant: "destructive" });
    }
  };

  const copyForTikTok = async (productId: string) => {
    try {
      await copyToClipboard(`${BASE_URL}/product/${productId}`);
      toast({
        title: "Link copied for TikTok",
        description: "Open TikTok, create a video, and paste the link in your caption or bio.",
      });
    } catch {
      toast({ title: "Could not copy link", description: "Please copy the URL manually.", variant: "destructive" });
    }
  };

  const filtered = products
    .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => statusFilter === "all" || deriveStatus(p) === statusFilter);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1200px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading…" : `${products.length} products listed`}
          </p>
        </div>
        <Button size="sm" className="bg-gradient-hero text-primary-foreground" asChild>
          <Link to="/seller/products/new">
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "pending_review", "draft", "low_stock", "out_of_stock"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {s === "all" ? "All" : statusConfig[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Table (desktop) + Card list (mobile) */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">

        {/* ── Mobile: card list ─────────────────────────────────── */}
        <div className="sm:hidden divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading products…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {search ? "No products match your search." : "No products yet. Add your first product!"}
            </div>
          ) : (
            filtered.map((p) => {
              const status = deriveStatus(p);
              const s = statusConfig[status];
              return (
                <div key={p.id} className="flex items-center gap-3 p-4">
                  {/* Thumbnail */}
                  {(() => {
                    const thumb = getProductThumbnail(p);
                    return thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        aria-hidden="true"
                        className="w-12 h-12 rounded-lg object-cover shrink-0 bg-muted"
                      />
                    ) : (
                      <LMPlaceholder size={48} />
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-foreground">£{p.price.toLocaleString()}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.className}`}>{s.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Stock: {p.stockQuantity} · Views: {p.views ?? 0}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-9 w-9 p-0"
                    aria-label="Edit product"
                    onClick={() => navigate(`/seller/products/${p.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-9 w-9 p-0"
                        aria-label="Share product"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => shareOnFacebook(p.id, status)}>
                        Share on Facebook
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={facebookDebugUrl(p.id)} target="_blank" rel="noopener noreferrer" aria-label="Refresh Facebook Preview (opens in new tab)">
                          Refresh Facebook Preview
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => copyForInstagram(p.id)}>
                        Copy link for Instagram
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyForTikTok(p.id)}>
                        Copy link for TikTok
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })
          )}
        </div>

        {/* ── Desktop: table ────────────────────────────────────── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Product</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Price</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Stock</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Views</th>
                <th className="text-right text-xs font-semibold text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                    Loading products…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    {search ? "No products match your search." : "No products yet. Add your first product!"}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const status = deriveStatus(p);
                  const s = statusConfig[status];
                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const thumb = getProductThumbnail(p);
                            return thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                aria-hidden="true"
                                className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted"
                              />
                            ) : (
                              <LMPlaceholder size={40} />
                            );
                          })()}
                          <span className="text-sm font-medium text-foreground line-clamp-1">{p.title}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-semibold text-foreground">£{p.price.toLocaleString()}</td>
                      <td className="p-4 text-sm text-foreground">{p.stockQuantity}</td>
                      <td className="p-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.className}`}>{s.label}</span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{p.views ?? 0}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => navigate(`/seller/products/${p.id}/edit`)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                aria-label="Share product"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => shareOnFacebook(p.id, status)}>
                                Share on Facebook
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={facebookDebugUrl(p.id)} target="_blank" rel="noopener noreferrer" aria-label="Refresh Facebook Preview (opens in new tab)">
                                  Refresh Facebook Preview
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => copyForInstagram(p.id)}>
                                Copy link for Instagram
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyForTikTok(p.id)}>
                                Copy link for TikTok
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default SellerProducts;
