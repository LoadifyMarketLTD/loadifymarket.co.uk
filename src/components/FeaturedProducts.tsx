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
 * Browse the Marketplace — dark navy premium section.
 * Fetches up to 6 active, approved products from the DB.
 * Shows nothing (launching-soon message) if no products are available yet.
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

  // Nothing to show yet — don't render hollow grid or placeholders
  if (!loading && products.length === 0) {
    return (
      <section
        className="relative overflow-hidden px-4 sm:px-6 py-12 sm:py-16"
        style={{ background: "linear-gradient(to bottom, #0A1930, #0F2A4A, #081426)" }}
      >
        <div className="relative w-full max-w-7xl mx-auto text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Marketplace Preview
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold text-white">
            Browse the Marketplace
          </h2>
          <p className="mt-3 text-sm text-white/60 max-w-md mx-auto">
            Products are being listed now. Be the first seller to go live.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              to="/signup?type=seller"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-400 to-green-500 text-black font-semibold rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_10px_30px_rgba(0,255,150,0.4)]"
            >
              List Your Products <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Still fetching — render nothing to avoid layout shift
  if (loading) return null;

  return (
    <section
      className="relative overflow-hidden px-4 sm:px-6 py-4 sm:py-16 lg:py-20"
      style={{ background: "linear-gradient(to bottom, #0A1930, #0F2A4A, #081426)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(circle at 30% 20%, rgba(0,255,150,0.08), transparent 40%)" }}
      />
      {/* Dot texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative w-full max-w-7xl mx-auto">
        {/* Section header — hidden on mobile */}
        <div className="hidden sm:block text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Marketplace Preview
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold text-white">
            Browse the Marketplace
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Products listed by independent UK sellers across all categories.
          </p>
        </div>

        {/* Product grid — 2-col on mobile, 3-col on sm+ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
          {products.map((item) => {
            const img = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;
            const href = item.slug ? `/product/${item.slug}` : `/product/${item.id}`;
            const categoryName = item.category?.name ?? "Product";
            return (
              <Link
                key={item.id}
                to={href}
                className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_20px_60px_rgba(0,255,150,0.15)] min-h-[160px] sm:min-h-[280px]"
              >
                {img ? (
                  <img
                    src={img}
                    alt={item.title}
                    width="800"
                    height="600"
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10" />
                )}
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                {/* Content overlay — compact on mobile */}
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5">
                  <p className="text-[9px] sm:text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5 sm:mb-1 line-clamp-1">
                    {categoryName}
                  </p>
                  <h3 className="text-xs sm:text-base font-extrabold text-white leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-semibold text-emerald-300">
                    £{item.price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Centered CTA — compact on mobile */}
        <div className="mt-4 sm:mt-10 flex justify-center">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-green-400 to-green-500 text-black text-sm sm:text-base font-semibold rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_10px_30px_rgba(0,255,150,0.4)]"
          >
            View Marketplace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
