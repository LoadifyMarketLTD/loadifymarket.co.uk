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
    <section className="bg-[#F8F7F4] px-6 pb-16 pt-10" aria-label="Marketplace products">
      <div className="mx-auto w-full max-w-[1480px] border-t border-[#0A234F]/10 pt-10 lg:px-4">
        <div className="mb-7 flex items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A7351]">
              Live marketplace
            </p>
            <h2 className="mt-2 font-serif text-[2.2rem] font-normal leading-tight tracking-[-0.025em] text-[#0A234F] sm:text-[2.65rem]">
              Discover what&apos;s live on Loadify
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5A6578] sm:text-[15px]">
              Real approved listings from independent sellers across the marketplace.
            </p>
          </div>

          {products.length > 0 && (
            <Link
              to="/catalog"
              className="group hidden items-center gap-2 pb-1 text-sm font-medium text-[#334155] transition-colors hover:text-[#0A234F] sm:inline-flex"
            >
              Browse all
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-[14px] border border-black/[0.06] bg-white">
                <div className="aspect-square animate-pulse bg-[#ECEAE5]" />
                <div className="space-y-2.5 p-4">
                  <div className="h-2.5 w-16 animate-pulse rounded bg-[#E7E4DE]" />
                  <div className="h-3 w-full animate-pulse rounded bg-[#E7E4DE]" />
                  <div className="h-4 w-16 animate-pulse rounded bg-[#E7E4DE]" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {products.map((item) => {
              const img = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;

              return (
                <Link
                  key={item.id}
                  to={`/product/${item.id}`}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-black/[0.065] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.035)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0A234F]/15 hover:shadow-[0_10px_24px_rgba(15,23,42,0.07)]"
                >
                  <div className="aspect-square overflow-hidden bg-[#F1F0EC]">
                    {img ? (
                      <img
                        src={img}
                        alt={item.title}
                        width={400}
                        height={400}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs font-medium text-[#7A8492]">
                        Product image unavailable
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    {item.category && (
                      <span className="line-clamp-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#7A8492]">
                        {item.category.name}
                      </span>
                    )}

                    <p className="mt-2 line-clamp-2 flex-1 text-[13px] font-semibold leading-5 text-[#1A202C] sm:text-sm">
                      {item.title}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-black/[0.06] pt-3.5">
                      <p className="text-sm font-semibold text-[#0A234F] sm:text-base">
                        £{item.price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#64748B] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#0A234F]" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[14px] border border-black/[0.06] bg-[#F1EFEA] px-6 py-8 text-[#0A234F]">
            <p className="font-serif text-2xl font-normal">The marketplace is growing.</p>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#5A6578]">
              New products appear as approved listings become available. Sellers can join Loadify and start building their catalogue today.
            </p>
            <Link
              to="/register?type=seller"
              className="group mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#0A234F]"
            >
              Start selling
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        )}

        {products.length > 0 && (
          <Link
            to="/catalog"
            className="group mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#334155] sm:hidden"
          >
            Browse all products
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;
