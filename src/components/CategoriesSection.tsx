/**
 * CategoriesSection.tsx
 *
 * Displays the 9 marketplace categories in a card grid.
 * Data sourced entirely from src/data/categories.ts — no duplication.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CATEGORY_CONFIG from "@/lib/category-config";

interface ProductCountRow {
  category?: { slug?: string } | { slug?: string }[] | null;
}

const CategoriesSection = () => {
  const navigate = useNavigate();
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [slugCounts, setSlugCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("category:categories!categoryId(slug)")
          .eq("isActive", true)
          .eq("isApproved", true);
        if (error || !data) return;
        const sc: Record<string, number> = {};
        (data as ProductCountRow[]).forEach((p) => {
          const cat = Array.isArray(p.category) ? p.category[0] : p.category;
          const slug = (cat as { slug?: string } | null)?.slug;
          if (slug) sc[slug] = (sc[slug] ?? 0) + 1;
        });
        setSlugCounts(sc);
      } catch {
        // counts remain at 0 — fallback labels shown
      }
    })();
  }, []);

  const getCountLabel = (slug: string): string => {
    const live = slugCounts[slug] ?? 0;
    if (live > 0) return `${live} listing${live === 1 ? "" : "s"}`;
    return "Browse listings";
  };

  const visible = showAll ? CATEGORY_CONFIG : CATEGORY_CONFIG.slice(0, 8);

  return (
    <section id="categories" className="py-14 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            Categories
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-display font-bold text-foreground">
            Browse by Category
          </h2>
          <p className="mt-4 text-muted-foreground">
            Discover thousands of products across all categories from verified UK
            sellers — all in one trusted marketplace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visible.map((cat) => {
            const isExpanded = expandedSlug === cat.slug;
            return (
              <div
                key={cat.slug}
                className="group rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-elevated transition-all duration-300 overflow-hidden"
              >
                {/* Header */}
                <button
                  className="w-full flex items-center gap-3 p-3 text-left"
                  onClick={() => navigate(`/category/${cat.slug}`)}
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
                    <img
                      src={cat.image}
                      alt={cat.label}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (!img.src.includes("placeholder"))
                          img.src = "/images/placeholder-product.jpg";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="font-display text-sm font-semibold text-foreground block truncate">
                      {cat.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getCountLabel(cat.slug)}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* Subcategories toggle */}
                <button
                  onClick={() => setExpandedSlug(isExpanded ? null : cat.slug)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors border-t border-border"
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    Subcategories
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-3">
                    <ul className="space-y-1.5">
                      {cat.subcategories.map((sub) => (
                        <li key={sub}>
                          <button
                            onClick={() =>
                              navigate(`/category/${cat.slug}`)
                            }
                            className="w-full text-left text-sm text-muted-foreground hover:text-primary transition-colors py-1 px-3 rounded-md hover:bg-primary/5"
                          >
                            {sub}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {CATEGORY_CONFIG.length > 8 && (
          <div className="text-center mt-8">
            <button
              onClick={() => {
                setShowAll(!showAll);
                setExpandedSlug(null);
              }}
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline transition-all"
            >
              {showAll
                ? "Show Less"
                : `View All ${CATEGORY_CONFIG.length} Categories`}
              {showAll ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoriesSection;
