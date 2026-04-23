import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ShowcaseProduct {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  category: { name: string; slug: string } | null;
  slug: string | null;
}

/**
 * Latest Products — clean B2B product grid.
 * Fetches up to 6 active, approved products from Supabase.
 * Shows a professional empty state when no live listings exist yet.
 * Never renders fake or hardcoded product data.
 */
const FeaturedProducts = () => {
  const [products, setProducts] = useState<ShowcaseProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, title, price, images, slug, category:categories!categoryId(name, slug)")
      .eq("isActive", true)
      .eq("isApproved", true)
      .order("createdAt", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!error && data) setProducts(data as unknown as ShowcaseProduct[]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section className="relative" aria-label="Marketplace products">
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="h-4 w-44 bg-gray-100 rounded mb-1 animate-pulse" />
          <div className="h-3 w-56 bg-gray-100 rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-gray-200">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white">
                <div className="aspect-square bg-gray-100 animate-pulse" />
                <div className="px-2.5 py-2.5 space-y-1.5">
                  <div className="h-2.5 w-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-2.5 w-full bg-gray-100 rounded animate-pulse" />
                  <div className="h-3.5 w-12 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative" aria-label="Marketplace products">
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8">

        <div className="flex items-center justify-between mb-4">
          <div>
              <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
                Marketplace Products
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Listed by verified UK trade suppliers
              </p>
          </div>
          {products.length > 0 && (
            <Link
              to="/catalog"
              className="text-[11px] font-bold text-[#15803d] uppercase tracking-wide hover:underline flex items-center gap-1"
            >
              Browse All <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {products.length > 0 ? (
          /* Product grid — gap-px hairline borders */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-gray-200">
            {products.map((item) => {
              const img =
                Array.isArray(item.images) && item.images.length > 0
                  ? item.images[0]
                  : null;
              const href = item.slug
                ? `/product/${item.slug}`
                : `/product/${item.id}`;
              return (
                <Link
                  key={item.id}
                  to={href}
                  className="group flex flex-col bg-white hover:bg-[#f8f9fb] hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                >
                  {/* Square thumbnail */}
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    {img ? (
                      <img
                        src={img}
                        alt={item.title}
                        width={400}
                        height={400}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-300 text-xs">No image</span>
                      </div>
                    )}
                  </div>

                  {/* Product info */}
                  <div className="px-2.5 py-2.5 flex flex-col gap-0.5 flex-1 border-t border-gray-100">
                    {item.category && (
                      <span className="text-[10px] font-bold text-[#0d2240] uppercase tracking-wide line-clamp-1">
                        {item.category.name}
                      </span>
                    )}
                    <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 flex-1">
                      {item.title}
                    </p>
                    <p className="text-sm font-black text-[#0d2240] mt-1">
                      £{item.price.toLocaleString("en-GB", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Professional empty state — no fake listings */
          <div className="border border-gray-200 bg-white px-6 py-10">
            <p className="text-sm font-semibold text-gray-900">
              No listings available yet.
            </p>
            <p className="text-xs text-gray-500 mt-1.5 mb-6 max-w-md leading-relaxed">
              We are currently onboarding verified UK trade suppliers.
              Be among the first to list wholesale products on Loadify Market.
            </p>
            <Link
              to="/register?type=seller"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#22C55E] text-[#0d2240] text-xs font-bold uppercase tracking-wide hover:bg-[#16a34a] transition-colors"
            >
              Register as Supplier <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

      </div>
    </section>
  );
};

export default FeaturedProducts;
