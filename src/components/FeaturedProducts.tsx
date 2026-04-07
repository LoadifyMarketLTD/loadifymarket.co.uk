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
 * Fetches up to 3 active, approved products from the DB.
 * Falls back to the catalog page if no products are available.
 */
const FeaturedProducts = () => {
  const [products, setProducts] = useState<ShowcaseProduct[]>([]);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, title, price, images, slug, category:categories!categoryId(name, slug)")
      .eq("isActive", true)
      .eq("isApproved", true)
      .order("createdAt", { ascending: false })
      .limit(3)
      .then(({ data, error }) => {
        if (!error && data) setProducts(data as unknown as ShowcaseProduct[]);
      });
  }, []);

  return (
    <section
      className="relative overflow-hidden px-4 sm:px-6 py-16 lg:py-20"
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
        {/* Centered header */}
        <div className="text-center mb-10">
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

        {/* 3 product cards */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {products.map((item) => {
              const img = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;
              const href = item.slug ? `/product/${item.slug}` : `/product/${item.id}`;
              const categoryName = item.category?.name ?? "Product";
              return (
                <Link
                  key={item.id}
                  to={href}
                  className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_20px_60px_rgba(0,255,150,0.15)]"
                  style={{ minHeight: "280px" }}
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                      {categoryName}
                    </p>
                    <h3 className="text-base font-extrabold text-white leading-snug">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-emerald-300">
                      £{item.price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Placeholder shown before sellers go live — keeps the section present */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 h-[220px] flex flex-col justify-end"
              >
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                <div className="relative p-5">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                    Sample Listing
                  </p>
                  <h3 className="text-base font-extrabold text-white/60 leading-snug">
                    Coming Soon
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Centered CTA below cards */}
        <div className="mt-10 flex justify-center">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-400 to-green-500 text-black font-semibold rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_10px_30px_rgba(0,255,150,0.4)]"
          >
            View Marketplace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
