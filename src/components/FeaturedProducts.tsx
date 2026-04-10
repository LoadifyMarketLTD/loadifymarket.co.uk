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
 * White/grey background, bordered cards, no dark gradients or glow effects.
 * Fetches up to 6 active, approved products from Supabase.
 * Renders nothing during loading to prevent layout shift.
 * Shows a "coming soon" state when no products are available yet.
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
      .limit(6)
      .then(({ data, error }) => {
        if (!error && data) setProducts(data as unknown as ShowcaseProduct[]);
        setLoading(false);
      });
  }, []);

  if (loading) return null;

  if (products.length === 0) {
    return (
      <section className="bg-white border-b border-gray-200" aria-label="Marketplace products">
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
              Marketplace Products
            </h2>
          </div>
          <div className="border border-gray-200 bg-[#f4f5f7] px-6 py-8 text-center">
            <p className="text-sm text-gray-600 font-medium">
              Products are being listed now.
            </p>
            <p className="text-xs text-gray-400 mt-1 mb-5">
              Be the first trade supplier to go live on Loadify Market.
            </p>
            <Link
              to="/register?type=seller"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0d2240] text-white text-xs font-bold uppercase tracking-wide hover:bg-[#1a3a5c] transition-colors"
            >
              List Your Products <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border-b border-gray-200" aria-label="Latest marketplace products">
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8">

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
              Latest Products
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Recently listed by UK trade suppliers
            </p>
          </div>
          <Link
            to="/catalog"
            className="text-[11px] font-bold text-[#0d2240] uppercase tracking-wide hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Product grid — gap-px hairline borders */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-gray-200">
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
                className="flex flex-col bg-white hover:bg-[#f8f9fb] transition-colors"
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
                      className="w-full h-full object-cover"
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
                <div className="px-2.5 py-2.5 flex flex-col gap-0.5 flex-1">
                  {item.category && (
                    <span className="text-[10px] font-bold text-[#0d2240] uppercase tracking-wide line-clamp-1">
                      {item.category.name}
                    </span>
                  )}
                  <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 flex-1">
                    {item.title}
                  </p>
                  <p className="text-sm font-black text-[#0d2240] mt-0.5">
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

      </div>
    </section>
  );
};

export default FeaturedProducts;
