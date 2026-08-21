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
}

const FeaturedProducts = () => {
  const [products, setProducts] = useState<ShowcaseProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, title, price, images, category:categories!categoryId(name, slug)")
      .eq("isActive", true)
      .eq("isApproved", true)
      .eq("listingStatus", "active")
      .or("listingContext.eq.service,stockQuantity.gt.0")
      .order("createdAt", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!error && data) setProducts(data as unknown as ShowcaseProduct[]);
        setLoading(false);
      });
  }, []);

  return (
    <section className="relative" aria-label="Marketplace products">
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 pb-10 pt-7">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">Live on Loadify</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.025em] text-white sm:text-3xl">Products you can explore now.</h2>
            <p className="mt-2 text-sm text-white/58">Real approved listings from the current marketplace.</p>
          </div>
          {products.length > 0 && (
            <Link
              to="/catalog"
              className="hidden items-center gap-2 text-xs font-extrabold text-[#F5A300] transition-colors hover:text-white sm:inline-flex"
            >
              Browse all <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-[18px] bg-white/90">
                <div className="aspect-square animate-pulse bg-slate-200" />
                <div className="space-y-2 p-3">
                  <div className="h-2.5 w-16 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {products.map((item) => {
              const img = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;
              return (
                <Link
                  key={item.id}
                  to={`/product/${item.id}`}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.16)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(0,0,0,0.22)]"
                >
                  <div className="aspect-square overflow-hidden bg-[#F2F4F7]">
                    {img ? (
                      <img
                        src={img}
                        alt={item.title}
                        width={400}
                        height={400}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#64748B]">Product image unavailable</div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-3 sm:p-3.5">
                    {item.category && (
                      <span className="line-clamp-1 text-[9px] font-black uppercase tracking-[0.13em] text-[#0E3FA9]">
                        {item.category.name}
                      </span>
                    )}
                    <p className="mt-1.5 line-clamp-2 flex-1 text-xs font-extrabold leading-5 text-[#0A234F] sm:text-sm">
                      {item.title}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#0A234F]/8 pt-3">
                      <p className="text-sm font-black text-[#0A234F] sm:text-base">
                        £{item.price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#F5A300] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[22px] bg-white px-6 py-8 text-[#0A234F]">
            <p className="text-base font-extrabold">The marketplace is growing.</p>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#64748B]">
              New products appear as approved listings become available. Sellers can join Loadify and start building their catalogue today.
            </p>
            <Link to="/register?type=seller" className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#0E3FA9]">
              Start selling <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        {products.length > 0 && (
          <Link to="/catalog" className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-[#F5A300] sm:hidden">
            Browse all products <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;
