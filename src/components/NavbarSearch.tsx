import { useState, useRef, useEffect } from "react";
import { Search, Tag, Package, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { mockProducts } from "@/data/mockProducts";

const categories = [
  "Electronics & Technology", "Clothing & Apparel", "Home & Garden",
  "Health & Beauty", "Toys & Games", "Food & Drink", "Tools & DIY",
  "Sports & Leisure", "Automotive", "Office & Stationery",
  "Baby & Nursery", "Jewellery & Watches", "Mixed Lots",
  "Customer Returns", "Overstock", "Clearance & Bargains",
];

interface Props {
  className?: string;
  onSelect?: () => void;
}

const NavbarSearch = ({ className, onSelect }: Props) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const q = query.trim().toLowerCase();

  const matchedCategories = q.length >= 2
    ? categories.filter((c) => c.toLowerCase().includes(q)).slice(0, 4)
    : [];

  const matchedProducts = q.length >= 2
    ? mockProducts.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.seller.toLowerCase().includes(q)
      ).slice(0, 5)
    : [];

  const hasResults = matchedCategories.length > 0 || matchedProducts.length > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goToCatalog = (params?: string) => {
    navigate(`/catalog${params ? `?${params}` : `?q=${encodeURIComponent(query)}`}`);
    setQuery("");
    setOpen(false);
    onSelect?.();
  };

  const goToProduct = (id: string) => {
    navigate(`/product/${id}`);
    setQuery("");
    setOpen(false);
    onSelect?.();
  };

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        placeholder="Search products, categories..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => q.length >= 2 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && q.length >= 2) goToCatalog();
          if (e.key === "Escape") setOpen(false);
        }}
        className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
      />

      {open && q.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden max-h-[420px] overflow-y-auto">
          {!hasResults ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          ) : (
            <>
              {matchedCategories.length > 0 && (
                <div className="px-3 pt-3 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Categories</p>
                  {matchedCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => goToCatalog(`category=${encodeURIComponent(cat)}`)}
                      className="flex items-center gap-2.5 w-full text-left px-2 py-2 rounded-md hover:bg-muted/60 transition-colors group"
                    >
                      <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors">{cat}</span>
                    </button>
                  ))}
                </div>
              )}

              {matchedProducts.length > 0 && (
                <div className="px-3 pt-2 pb-1">
                  {matchedCategories.length > 0 && <div className="border-t border-border mb-2" />}
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Products</p>
                  {matchedProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => goToProduct(p.id)}
                      className="flex items-center gap-3 w-full text-left px-2 py-2 rounded-md hover:bg-muted/60 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-md bg-muted overflow-hidden shrink-0">
                        <img src={p.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.category} · £{p.price.toLocaleString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => goToCatalog()}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2.5 text-xs font-medium text-primary hover:bg-primary/5 border-t border-border transition-colors"
              >
                View all results for "{query}" <ArrowRight className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default NavbarSearch;
